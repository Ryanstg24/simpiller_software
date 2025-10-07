# Diagnose: Provider Seeing Wrong Organization's Patients

## Problem
A provider at **The Chautauqua Center** is seeing patients from a **different organization**.

## Expected Behavior
Providers should only see patients where:
- `patients.assigned_provider_id` = provider's user ID
- `patients.organization_id` = provider's organization ID

## Current Code Logic (CORRECT)
```typescript
// From use-patients.ts line 171-173
else if (isProvider) {
  // Provider sees only their assigned patients
  query = query.eq('assigned_provider_id', user.id);
}
```

This means providers see **ALL patients assigned to them**, regardless of organization.

---

## Root Cause Analysis

The code is working as designed, but there are **3 possible scenarios** for why a provider sees wrong-organization patients:

### Scenario 1: ❌ **Patients Incorrectly Assigned**
**Problem:** Patients from Organization B were assigned to a provider from Organization A

**How to check:**
Run `DEBUG_CHAUTAUQUA_PROVIDER.sql` in Supabase SQL Editor, specifically Step 3.
Look for rows where `org_check` = `❌ MISMATCH`

**How to fix:**
```sql
-- Find mismatched assignments
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as patient_name,
  patient_org.name as patient_org,
  provider_org.name as provider_org
FROM patients p
LEFT JOIN organizations patient_org ON p.organization_id = patient_org.id
LEFT JOIN users provider ON p.assigned_provider_id = provider.id
LEFT JOIN user_role_assignments ura ON provider.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id AND ur.name = 'provider'
LEFT JOIN organizations provider_org ON ur.organization_id = provider_org.id
WHERE p.organization_id != ur.organization_id
  AND p.assigned_provider_id IS NOT NULL
  AND p.is_active = true;

-- Fix: Reassign patients to correct provider OR update patient's organization
-- Option 1: Unassign wrong-org patients
UPDATE patients
SET assigned_provider_id = NULL
WHERE organization_id != (
  SELECT ur.organization_id 
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = patients.assigned_provider_id
    AND ur.name = 'provider'
  LIMIT 1
);

-- Option 2: Reassign to a provider in the correct organization
-- (Manual - need to identify correct provider)
```

---

### Scenario 2: ⚠️ **Provider Has Multiple Roles**
**Problem:** Provider has a "provider" role in BOTH The Chautauqua Center AND another organization

**How to check:**
```sql
SELECT 
  u.email,
  u.first_name || ' ' || u.last_name as provider_name,
  ur.name as role_name,
  o.name as organization_name,
  COUNT(*) OVER (PARTITION BY u.id, ur.name) as provider_role_count
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN organizations o ON ur.organization_id = o.id
WHERE ur.name = 'provider'
HAVING COUNT(*) OVER (PARTITION BY u.id, ur.name) > 1;
```

**How to fix:**
This might be intentional (provider works at multiple orgs). If not:
```sql
-- Remove incorrect provider role
DELETE FROM user_role_assignments
WHERE role_id IN (
  SELECT ur.id 
  FROM user_roles ur
  WHERE ur.name = 'provider'
    AND ur.organization_id = '<wrong-org-id>'
)
AND user_id = '<provider-user-id>';
```

---

### Scenario 3: 🐛 **Code Logic Issue (Unlikely)**
**Problem:** The filtering logic isn't working correctly

**How to check:**
Enable console logging for the provider and check what's being logged:
```typescript
// In use-patients.ts, the provider should see this log:
console.log('[Patients] Fetching patients for provider:', user.id);
```

**What to verify:**
1. Provider has `isProvider = true`
2. Query includes `.eq('assigned_provider_id', user.id)`
3. Console shows the correct user ID

---

## Quick Diagnostic Steps

### Step 1: Identify the Provider
Ask the provider for their email address.

### Step 2: Run SQL Diagnostic
Copy and paste `DEBUG_CHAUTAUQUA_PROVIDER.sql` into Supabase SQL Editor and run it.

### Step 3: Check Results
Look at **Step 3** output - any rows with `❌ MISMATCH` are the problem.

### Step 4: Identify Root Cause
- **If mismatches found:** Scenario 1 - patients incorrectly assigned
- **If provider has multiple provider roles:** Scenario 2 - multiple org roles
- **If neither:** Check console logs for Scenario 3

---

## Solution Based on Scenario

### Solution for Scenario 1: Unassign Wrong Patients
```sql
-- Unassign all patients from wrong organizations
UPDATE patients p
SET assigned_provider_id = NULL
WHERE assigned_provider_id = '<provider-user-id>'
  AND organization_id != (
    SELECT ur.organization_id 
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = '<provider-user-id>'
      AND ur.name = 'provider'
      AND ur.organization_id = '<chautauqua-org-id>'
    LIMIT 1
  );
```

### Solution for Scenario 2: Remove Extra Provider Role
```sql
-- Remove provider role from wrong organization
DELETE FROM user_role_assignments
WHERE user_id = '<provider-user-id>'
  AND role_id IN (
    SELECT ur.id 
    FROM user_roles ur
    WHERE ur.name = 'provider'
      AND ur.organization_id != '<chautauqua-org-id>'
  );
```

---

## Prevention: Add Database Constraint

To prevent this in the future, we could add a constraint that validates patient-provider organization matching:

```sql
-- Add a check to ensure patients are only assigned to providers in same org
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
        AND ur.name = 'provider'
        AND ur.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Provider must belong to the same organization as the patient';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER validate_patient_provider_org
  BEFORE INSERT OR UPDATE OF assigned_provider_id, organization_id
  ON patients
  FOR EACH ROW
  EXECUTE FUNCTION check_patient_provider_org_match();
```

---

## Next Steps

1. **Run the diagnostic:** `DEBUG_CHAUTAUQUA_PROVIDER.sql`
2. **Share the results** with me (specifically Step 3 and Step 4)
3. **I'll provide the exact fix SQL** based on what we find
4. **Consider adding the prevention trigger** to avoid future issues

---

**Note:** The application code is working correctly. This is a **data integrity issue**, not a code bug.

