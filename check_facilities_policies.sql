-- Check current RLS policies on facilities table
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

-- Check if RLS is enabled on facilities table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'facilities';

-- Check the current user's roles
SELECT 
  ura.user_id,
  ur.name as role_name,
  ur.organization_id,
  o.name as organization_name
FROM user_role_assignments ura
JOIN user_roles ur ON ur.id = ura.role_id
JOIN organizations o ON o.id = ur.organization_id
WHERE ura.user_id = auth.uid();

-- Check if the user has any roles at all
SELECT COUNT(*) as role_count
FROM user_role_assignments ura
WHERE ura.user_id = auth.uid();
