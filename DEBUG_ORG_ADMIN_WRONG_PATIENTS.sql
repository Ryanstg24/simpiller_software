-- CRITICAL: Organization Admin at TCC Seeing Patients from Different Organization
-- This is a data isolation security issue

-- ========================================
-- STEP 1: Find The Chautauqua Center (TCC)
-- ========================================
SELECT 'Step 1: Find TCC Organization' as step;
SELECT id, name, acronym 
FROM organizations 
WHERE name LIKE '%Chautauqua%';

-- ========================================
-- STEP 2: Find Organization Admins at TCC
-- ========================================
SELECT 'Step 2: TCC Organization Admins' as step;
SELECT 
  u.id as user_id,
  u.email,
  u.first_name || ' ' || u.last_name as user_name,
  ur.name as role_name,
  ur.organization_id,
  o.name as organization_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE ur.name = 'organization_admin'
  AND ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
ORDER BY u.email;

-- ========================================
-- STEP 3: Check if Org Admins Have Multiple Roles
-- ========================================
SELECT 'Step 3: Multiple Roles for TCC Org Admins' as step;
SELECT 
  u.id as user_id,
  u.email,
  u.first_name || ' ' || u.last_name as user_name,
  STRING_AGG(ur.name || ' (' || COALESCE(o.name, 'No Org') || ')', ', ' ORDER BY ur.name) as all_roles,
  COUNT(*) as role_count
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE u.id IN (
  -- Get users who are org admins at TCC
  SELECT DISTINCT u.id 
  FROM users u
  JOIN user_role_assignments ura ON u.id = ura.user_id
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ur.name = 'organization_admin'
    AND ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
)
GROUP BY u.id, u.email, u.first_name, u.last_name
HAVING COUNT(*) > 1;

-- ========================================
-- STEP 4: Critical Check - Which Organization ID Would Auth Context Pick?
-- ========================================
SELECT 'Step 4: Which Organization ID Gets Selected in Auth?' as step;

-- This simulates the auth context logic:
-- userOrganizationId = userRoles.find(role => role.name !== 'simpiller_admin')?.organization_id
-- JavaScript .find() returns the FIRST match

WITH user_roles_ordered AS (
  SELECT 
    u.id as user_id,
    u.email,
    ura.id as assignment_id,
    ur.id as role_id,
    ur.name as role_name,
    ur.organization_id,
    o.name as organization_name,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY ura.assigned_at ASC) as role_order
  FROM users u
  JOIN user_role_assignments ura ON u.id = ura.user_id
  JOIN user_roles ur ON ura.role_id = ur.id
  LEFT JOIN organizations o ON ur.organization_id = o.id
  WHERE u.id IN (
    SELECT DISTINCT u.id 
    FROM users u
    JOIN user_role_assignments ura ON u.id = ura.user_id
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ur.name = 'organization_admin'
      AND ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
  )
  AND ur.name != 'simpiller_admin'
)
SELECT 
  user_id,
  email,
  role_name,
  organization_id,
  organization_name,
  role_order,
  CASE 
    WHEN role_order = 1 THEN '⚠️ THIS ORG ID WILL BE USED BY AUTH CONTEXT'
    ELSE 'Not used'
  END as auth_context_selection
FROM user_roles_ordered
ORDER BY user_id, role_order;

-- ========================================
-- STEP 5: Find Patients These Org Admins Can See
-- ========================================
SELECT 'Step 5: What Patients Would Org Admin See?' as step;

WITH tcc_org_admin_expected_org AS (
  -- Get the organization_id that auth context will pick (first non-simpiller_admin role)
  SELECT DISTINCT
    u.id as user_id,
    u.email,
    (
      SELECT ur.organization_id 
      FROM user_role_assignments ura2
      JOIN user_roles ur ON ura2.role_id = ur.id
      WHERE ura2.user_id = u.id
        AND ur.name != 'simpiller_admin'
      ORDER BY ura2.assigned_at ASC
      LIMIT 1
    ) as picked_organization_id
  FROM users u
  JOIN user_role_assignments ura ON u.id = ura.user_id
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ur.name = 'organization_admin'
    AND ur.organization_id IN (SELECT id FROM organizations WHERE name LIKE '%Chautauqua%')
)
SELECT 
  admin.email as org_admin_email,
  admin.picked_organization_id,
  picked_org.name as org_admin_sees_this_org,
  tcc.name as should_see_this_org,
  COUNT(p.id) as patient_count,
  CASE 
    WHEN admin.picked_organization_id = tcc.id THEN '✅ CORRECT'
    ELSE '❌ WRONG ORG - SECURITY ISSUE'
  END as security_check
FROM tcc_org_admin_expected_org admin
LEFT JOIN organizations picked_org ON admin.picked_organization_id = picked_org.id
CROSS JOIN (SELECT id, name FROM organizations WHERE name LIKE '%Chautauqua%') tcc
LEFT JOIN patients p ON p.organization_id = admin.picked_organization_id AND p.is_active = true
GROUP BY admin.email, admin.picked_organization_id, picked_org.name, tcc.id, tcc.name;

-- ========================================
-- STEP 6: Detailed Patient List by Organization
-- ========================================
SELECT 'Step 6: Patient Breakdown by Organization' as step;
SELECT 
  o.name as organization_name,
  COUNT(p.id) as active_patient_count
FROM organizations o
LEFT JOIN patients p ON p.organization_id = o.id AND p.is_active = true
GROUP BY o.id, o.name
ORDER BY active_patient_count DESC;

-- ========================================
-- STEP 7: Root Cause - Show Exact Problem
-- ========================================
SELECT 'Step 7: SMOKING GUN - Show Exact Problem' as step;

SELECT 
  u.email as org_admin_email,
  'Should only see: ' || tcc.name as expected,
  'Actually sees: ' || picked_org.name as actual,
  CASE 
    WHEN (
      SELECT ur.organization_id 
      FROM user_role_assignments ura2
      JOIN user_roles ur ON ura2.role_id = ur.id
      WHERE ura2.user_id = u.id AND ur.name != 'simpiller_admin'
      ORDER BY ura2.assigned_at ASC LIMIT 1
    ) = tcc.id THEN '✅ NO ISSUE'
    ELSE '🚨 CRITICAL: Wrong organization_id selected!'
  END as diagnosis,
  (
    SELECT STRING_AGG(
      ur.name || ' (Org: ' || COALESCE(o.name, 'NULL') || ')',
      ' | '
      ORDER BY ura2.assigned_at ASC
    )
    FROM user_role_assignments ura2
    JOIN user_roles ur ON ura2.role_id = ur.id
    LEFT JOIN organizations o ON ur.organization_id = o.id
    WHERE ura2.user_id = u.id
  ) as all_roles_in_order
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
CROSS JOIN (SELECT id, name FROM organizations WHERE name LIKE '%Chautauqua%') tcc
LEFT JOIN organizations picked_org ON picked_org.id = (
  SELECT ur2.organization_id 
  FROM user_role_assignments ura2
  JOIN user_roles ur2 ON ura2.role_id = ur2.id
  WHERE ura2.user_id = u.id AND ur2.name != 'simpiller_admin'
  ORDER BY ura2.assigned_at ASC LIMIT 1
)
WHERE ur.name = 'organization_admin'
  AND ur.organization_id = tcc.id
GROUP BY u.id, u.email, tcc.id, tcc.name, picked_org.name;

