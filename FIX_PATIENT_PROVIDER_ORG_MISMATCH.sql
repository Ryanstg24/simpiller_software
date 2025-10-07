-- FIX: Patient-Provider Organization Mismatch
-- Run this after identifying the specific issue via DEBUG_CHAUTAUQUA_PROVIDER.sql

-- ========================================
-- STEP 1: Identify the Problem
-- ========================================

-- Find all patients assigned to providers from different organizations
SELECT 
  p.id as patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  p.organization_id as patient_org_id,
  patient_org.name as patient_org_name,
  p.assigned_provider_id as provider_id,
  provider.email as provider_email,
  provider.first_name || ' ' || provider.last_name as provider_name,
  ur.organization_id as provider_org_id,
  provider_org.name as provider_org_name,
  CASE 
    WHEN p.organization_id = ur.organization_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH - FIX NEEDED'
  END as status
FROM patients p
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
LEFT JOIN organizations provider_org ON ur.organization_id = provider_org.id
WHERE p.assigned_provider_id IS NOT NULL
  AND p.is_active = true
  AND p.organization_id != ur.organization_id
ORDER BY patient_org.name, provider.email;

-- ========================================
-- STEP 2: Count Mismatches
-- ========================================

SELECT 
  patient_org.name as patient_organization,
  provider_org.name as provider_organization,
  COUNT(*) as mismatch_count
FROM patients p
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
LEFT JOIN organizations provider_org ON ur.organization_id = provider_org.id
WHERE p.assigned_provider_id IS NOT NULL
  AND p.is_active = true
  AND p.organization_id != ur.organization_id
GROUP BY patient_org.name, provider_org.name
ORDER BY mismatch_count DESC;

-- ========================================
-- STEP 3: Fix Option 1 - Unassign Mismatched Patients
-- ========================================

-- This removes the provider assignment for patients from wrong organizations
-- They will need to be manually reassigned to correct providers

-- PREVIEW (before running the fix):
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as patient_name,
  patient_org.name as patient_org,
  provider.email as will_be_unassigned_from,
  'Will unassign' as action
FROM patients p
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
WHERE p.assigned_provider_id IS NOT NULL
  AND p.is_active = true
  AND p.organization_id != ur.organization_id;

-- EXECUTE THE FIX (uncomment to run):
/*
UPDATE patients p
SET 
  assigned_provider_id = NULL,
  updated_at = NOW()
WHERE p.assigned_provider_id IS NOT NULL
  AND p.is_active = true
  AND p.organization_id != (
    SELECT ur.organization_id 
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = p.assigned_provider_id
      AND ur.name = 'provider'
    LIMIT 1
  );
*/

-- ========================================
-- STEP 4: Fix Option 2 - Fix Specific Provider (Chautauqua Center)
-- ========================================

-- If you know the specific provider, use this targeted fix

-- First, find the Chautauqua Center organization ID:
SELECT id, name FROM organizations WHERE name LIKE '%Chautauqua%';

-- Then, find the provider's ID:
SELECT 
  u.id, 
  u.email, 
  u.first_name || ' ' || u.last_name as name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE ur.name = 'provider'
  AND ur.organization_id = '<chautauqua-org-id-from-above>';

-- Unassign patients from wrong orgs for this specific provider:
/*
UPDATE patients
SET 
  assigned_provider_id = NULL,
  updated_at = NOW()
WHERE assigned_provider_id = '<provider-id-from-above>'
  AND organization_id != '<chautauqua-org-id>';
*/

-- ========================================
-- STEP 5: Verification
-- ========================================

-- After running the fix, verify no mismatches remain:
SELECT 
  COUNT(*) as remaining_mismatches
FROM patients p
LEFT JOIN user_role_assignments ura ON p.assigned_provider_id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
WHERE p.assigned_provider_id IS NOT NULL
  AND p.is_active = true
  AND p.organization_id != ur.organization_id;

-- Should return 0 if fix was successful

-- ========================================
-- STEP 6: Prevention - Add Constraint (OPTIONAL)
-- ========================================

-- Add a database trigger to prevent future mismatches

CREATE OR REPLACE FUNCTION check_patient_provider_org_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_provider_id IS NOT NULL THEN
    -- Check if provider belongs to same organization
    IF NOT EXISTS (
      SELECT 1 
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = NEW.assigned_provider_id
        AND ur.name IN ('provider', 'organization_admin')
        AND ur.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Provider (%) must belong to the same organization (%) as the patient', 
        NEW.assigned_provider_id, NEW.organization_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (uncomment to enable):
/*
DROP TRIGGER IF EXISTS validate_patient_provider_org ON patients;
CREATE TRIGGER validate_patient_provider_org
  BEFORE INSERT OR UPDATE OF assigned_provider_id, organization_id
  ON patients
  FOR EACH ROW
  EXECUTE FUNCTION check_patient_provider_org_match();
*/

-- ========================================
-- STEP 7: Find Correct Providers to Reassign To
-- ========================================

-- For each unassigned patient, find eligible providers in their organization:
SELECT 
  p.id as patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  patient_org.name as patient_org,
  u.id as eligible_provider_id,
  u.email as provider_email,
  u.first_name || ' ' || u.last_name as provider_name
FROM patients p
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN user_role_assignments ura ON ura.user_id != p.assigned_provider_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN users u ON ura.user_id = u.id
WHERE p.assigned_provider_id IS NULL
  AND p.is_active = true
  AND ur.name = 'provider'
  AND ur.organization_id = p.organization_id
  AND u.is_active = true
ORDER BY p.id, u.email;

-- Manual reassignment (example):
/*
UPDATE patients
SET 
  assigned_provider_id = '<correct-provider-id>',
  updated_at = NOW()
WHERE id = '<patient-id>';
*/

