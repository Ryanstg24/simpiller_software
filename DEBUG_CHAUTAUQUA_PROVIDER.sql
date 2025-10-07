-- DEBUG: Provider at Chautauqua Center seeing wrong patients
-- Run this in Supabase SQL Editor

-- Step 1: Find The Chautauqua Center organization
SELECT 'Step 1: Chautauqua Center Organization' as step;
SELECT id, name, acronym, created_at
FROM organizations
WHERE name LIKE '%Chautauqua%';

-- Step 2: Find all users/providers with roles at Chautauqua Center
SELECT 'Step 2: Chautauqua Center Users & Roles' as step;
SELECT 
  u.id as user_id,
  u.email,
  u.first_name || ' ' || u.last_name as user_name,
  ur.name as role_name,
  ur.organization_id as role_org_id,
  o.name as role_org_name,
  ura.assigned_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
ORDER BY u.email, ur.name;

-- Step 3: For each provider at Chautauqua, check their assigned patients
SELECT 'Step 3: Provider Patient Assignments' as step;
SELECT 
  p.id as patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  p.assigned_provider_id,
  provider.email as provider_email,
  provider.first_name || ' ' || provider.last_name as provider_name,
  p.organization_id as patient_org_id,
  patient_org.name as patient_org_name,
  provider_role_org.name as provider_role_org_name,
  ur.organization_id as provider_role_org_id,
  CASE 
    WHEN p.organization_id = ur.organization_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as org_check
FROM patients p
JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
LEFT JOIN organizations provider_role_org ON ur.organization_id = provider_role_org.id
WHERE p.is_active = true
  AND p.assigned_provider_id IN (
    SELECT DISTINCT u.id 
    FROM users u
    JOIN user_role_assignments ura ON u.id = ura.user_id
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
      AND ur.name = 'provider'
  )
ORDER BY provider.email, p.created_at DESC;

-- Step 4: Summary - Are there patient/provider organization mismatches?
SELECT 'Step 4: Mismatch Summary' as step;
SELECT 
  provider.email as provider_email,
  COUNT(*) as total_patients,
  COUNT(CASE WHEN p.organization_id = ur.organization_id THEN 1 END) as matching_org_patients,
  COUNT(CASE WHEN p.organization_id != ur.organization_id THEN 1 END) as mismatched_org_patients
FROM patients p
JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
WHERE p.is_active = true
  AND p.assigned_provider_id IN (
    SELECT DISTINCT u.id 
    FROM users u
    JOIN user_role_assignments ura ON u.id = ura.user_id
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
      AND ur.name = 'provider'
  )
GROUP BY provider.email, provider.id;

-- Step 5: Check if provider role is correctly linked to organization
SELECT 'Step 5: Provider Role Configuration' as step;
SELECT 
  u.email,
  ur.name as role_name,
  ur.organization_id,
  o.name as organization_name,
  CASE 
    WHEN ur.organization_id IS NULL THEN '❌ NO ORG LINKED TO ROLE'
    ELSE '✅ ORG LINKED'
  END as role_status
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE u.id IN (
  SELECT DISTINCT u.id 
  FROM users u
  JOIN user_role_assignments ura ON u.id = ura.user_id
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
);

