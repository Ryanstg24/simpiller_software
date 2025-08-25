-- Test medication access and RLS policies
-- First, let's see what policies exist
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
WHERE tablename = 'medications';

-- Check if we can insert a test medication (this will fail if RLS is blocking)
-- We'll use a simple test to see what the actual error is
SELECT 
    'Testing medication access' as test,
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    ) as is_simpiller_admin;

-- Check current user's roles
SELECT 
    u.email,
    ur.name as role_name,
    o.name as organization_name
FROM auth.users u
JOIN user_role_assignments ura ON ura.user_id = u.id
JOIN user_roles ur ON ur.id = ura.role_id
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE u.id = auth.uid();
