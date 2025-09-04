-- Add comprehensive RLS policies for pharmacies table
-- This allows organization admins to manage pharmacies within their organization
-- and Simpiller admins to manage all pharmacies

-- Enable RLS on pharmacies table if not already enabled
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- Policy 1: Organization admins can view pharmacies in their organization
CREATE POLICY "Organization admins can view pharmacies in their organization" ON pharmacies
FOR SELECT USING (
  -- Simpiller admins can view all pharmacies
  is_simpiller_admin()
  OR
  -- Organization admins can view pharmacies in their organization
  (
    is_organization_admin() 
    AND 
    organization_id IN (
      SELECT organization_id 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
    )
  )
);

-- Policy 2: Organization admins can create pharmacies in their organization
CREATE POLICY "Organization admins can create pharmacies in their organization" ON pharmacies
FOR INSERT WITH CHECK (
  -- Simpiller admins can create pharmacies for any organization
  is_simpiller_admin()
  OR
  -- Organization admins can only create pharmacies in their organization
  (
    is_organization_admin() 
    AND 
    -- Ensure the pharmacy being created belongs to their organization
    organization_id IN (
      SELECT organization_id 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
    )
  )
);

-- Policy 3: Organization admins can update pharmacies in their organization
CREATE POLICY "Organization admins can update pharmacies in their organization" ON pharmacies
FOR UPDATE USING (
  -- Simpiller admins can update all pharmacies
  is_simpiller_admin()
  OR
  -- Organization admins can update pharmacies in their organization
  (
    is_organization_admin() 
    AND 
    organization_id IN (
      SELECT organization_id 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
    )
  )
);

-- Policy 4: Organization admins can delete pharmacies in their organization
CREATE POLICY "Organization admins can delete pharmacies in their organization" ON pharmacies
FOR DELETE USING (
  -- Simpiller admins can delete all pharmacies
  is_simpiller_admin()
  OR
  -- Organization admins can delete pharmacies in their organization
  (
    is_organization_admin() 
    AND 
    organization_id IN (
      SELECT organization_id 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'organization_admin'
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
WHERE tablename = 'pharmacies'
ORDER BY cmd, policyname;
