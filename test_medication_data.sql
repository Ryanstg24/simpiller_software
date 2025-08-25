-- Test if the patient and user IDs exist in the database
-- Replace these with the actual IDs from the error log

-- Test patient ID
SELECT 
    'Patient Check' as test_type,
    id,
    first_name,
    last_name,
    organization_id,
    is_active
FROM patients 
WHERE id = '59794794-f7eb-46ce-a617-7f90404c3cac';

-- Test user ID
SELECT 
    'User Check' as test_type,
    id,
    email,
    first_name,
    last_name,
    is_active
FROM users 
WHERE id = '2debeb5c-ef33-49a3-8d2f-71810ecdf10d';

-- Test if user has proper role assignments
SELECT 
    'User Role Check' as test_type,
    u.email,
    ur.name as role_name,
    o.name as organization_name
FROM users u
JOIN user_role_assignments ura ON ura.user_id = u.id
JOIN user_roles ur ON ur.id = ura.role_id
LEFT JOIN organizations o ON o.id = ur.organization_id
WHERE u.id = '2debeb5c-ef33-49a3-8d2f-71810ecdf10d';

-- Test if patient belongs to user's organization
SELECT 
    'Patient-User Organization Check' as test_type,
    p.first_name as patient_first_name,
    p.last_name as patient_last_name,
    p.organization_id as patient_org_id,
    o.name as patient_org_name,
    u.email as user_email,
    ur.name as user_role,
    ur.organization_id as user_org_id
FROM patients p
JOIN organizations o ON o.id = p.organization_id
JOIN users u ON u.id = '2debeb5c-ef33-49a3-8d2f-71810ecdf10d'
JOIN user_role_assignments ura ON ura.user_id = u.id
JOIN user_roles ur ON ur.id = ura.role_id
WHERE p.id = '59794794-f7eb-46ce-a617-7f90404c3cac';
