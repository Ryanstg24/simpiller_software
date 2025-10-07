# CRITICAL: Organization Admin Security Vulnerability Fix

## 🚨 Security Issue

**Current Code (VULNERABLE):**
```typescript
// auth-context-v2.tsx line 300-302
const userOrganizationId = userRoles.find(role => 
  role.name !== 'simpiller_admin'
)?.organization_id || null;
```

**Problem:** Returns the FIRST non-simpiller_admin role's organization_id, which may be the wrong organization.

---

## Example Attack Scenario

### User has these roles:
1. `provider` (Org A) - assigned_at: 2024-01-01
2. `organization_admin` (TCC) - assigned_at: 2024-01-15

### What happens:
- `.find()` returns the **first** role = `provider` (Org A)
- `userOrganizationId` = Org A's ID
- User is org admin for TCC
- Query: `patients.organization_id = userOrganizationId` (Org A)
- **Result: TCC org admin sees ALL of Org A's patients!** 🚨

---

## The Fix

We need to prioritize roles when selecting organization ID:

**Priority Order:**
1. `organization_admin` - highest priority
2. `provider` - medium priority
3. `billing` - lowest priority
4. Any other non-simpiller_admin role

**Fixed Code:**
```typescript
// Get organization ID with proper role prioritization
const userOrganizationId = (() => {
  // Priority 1: organization_admin
  const orgAdminRole = userRoles.find(role => role.name === 'organization_admin');
  if (orgAdminRole?.organization_id) return orgAdminRole.organization_id;
  
  // Priority 2: provider
  const providerRole = userRoles.find(role => role.name === 'provider');
  if (providerRole?.organization_id) return providerRole.organization_id;
  
  // Priority 3: billing
  const billingRole = userRoles.find(role => role.name === 'billing');
  if (billingRole?.organization_id) return billingRole.organization_id;
  
  // Fallback: any non-simpiller_admin role
  const anyRole = userRoles.find(role => 
    role.name !== 'simpiller_admin' && role.organization_id
  );
  return anyRole?.organization_id || null;
})();
```

---

## Impact Analysis

### Before Fix:
- ❌ Org admins may see wrong organization's patients
- ❌ HIPAA/data privacy violation
- ❌ Security breach
- ❌ Users can access data they shouldn't

### After Fix:
- ✅ Org admins always see their own organization
- ✅ Role hierarchy properly enforced
- ✅ Data isolation restored
- ✅ Compliant with data privacy requirements

---

## How to Verify the Fix

### Step 1: Run Diagnostic
```sql
-- Run DEBUG_ORG_ADMIN_WRONG_PATIENTS.sql in Supabase
-- Look at Step 7 - should show the issue
```

### Step 2: Apply Code Fix
Update `src/contexts/auth-context-v2.tsx` with the fixed code above.

### Step 3: Test
1. Log in as TCC org admin
2. Open browser console
3. Check: `console.log('[Auth V2] userOrganizationId:', userOrganizationId)`
4. Verify it matches TCC's organization ID

### Step 4: Verify Patient List
1. Navigate to Patients page
2. All patients should be from TCC organization
3. Check patient list - should only show TCC patients

---

## Alternative Fix (More Explicit)

If you want even more control, you could check which role is "active":

```typescript
const userOrganizationId = (() => {
  // If user is organization_admin anywhere, use that org
  if (isOrganizationAdmin) {
    const orgAdminRole = userRoles.find(role => role.name === 'organization_admin');
    if (orgAdminRole?.organization_id) return orgAdminRole.organization_id;
  }
  
  // If user is provider, use provider's org
  if (isProvider) {
    const providerRole = userRoles.find(role => role.name === 'provider');
    if (providerRole?.organization_id) return providerRole.organization_id;
  }
  
  // If user is billing, use billing's org
  if (isBilling) {
    const billingRole = userRoles.find(role => role.name === 'billing');
    if (billingRole?.organization_id) return billingRole.organization_id;
  }
  
  // Fallback
  return null;
})();
```

---

## Data Cleanup (Also Needed)

Even with the code fix, you may have:
1. Users with multiple roles in different orgs (data issue)
2. Patients assigned to wrong-org providers (data issue)

Run `DEBUG_ORG_ADMIN_WRONG_PATIENTS.sql` to identify these issues.

---

## Prevention

After fixing, consider:

### 1. Database Constraint
Ensure users can only have roles in ONE organization:

```sql
-- Check if user already has a role in a different org
CREATE OR REPLACE FUNCTION check_user_single_org()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = NEW.user_id
      AND ur.organization_id IS NOT NULL
      AND ur.organization_id != (
        SELECT organization_id 
        FROM user_roles 
        WHERE id = NEW.role_id
      )
      AND ur.name != 'simpiller_admin'
  ) THEN
    RAISE EXCEPTION 'User cannot have roles in multiple organizations';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_single_org
  BEFORE INSERT ON user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_user_single_org();
```

### 2. Admin UI Validation
When assigning roles, check if user already has role in different org.

---

## Severity: CRITICAL

**Why Critical:**
- Data isolation breach
- Users can see other organizations' patient data
- HIPAA compliance violation
- Security vulnerability

**Priority:** Fix immediately!

---

## Next Steps

1. ✅ Apply code fix to `auth-context-v2.tsx`
2. ✅ Run `DEBUG_ORG_ADMIN_WRONG_PATIENTS.sql` to identify data issues
3. ✅ Clean up any multi-org role assignments
4. ✅ Test with TCC org admin
5. ✅ Add database constraint to prevent future issues
6. ✅ Audit logs for any unauthorized data access

