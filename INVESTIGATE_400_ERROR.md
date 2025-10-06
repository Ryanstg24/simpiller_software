# Investigating the 400 Error

## Current Situation
You added the authenticated user policy, but still getting a 400 error when querying scan sessions.

## Possible Causes

### 1. Policy Subquery is Too Complex or Has an Error
The policy uses a complex subquery with JOINs. If there's an issue with the subquery (missing column, wrong table reference, etc.), Supabase might return a 400.

### 2. The Policy Might Not Be Active
Check if the policy actually exists and is enabled.

### 3. User Role Data Might Be Missing
If your user doesn't have proper role assignments, the policy might be failing.

## Debugging Steps

### Step 1: Check What Policies Exist
Run this in Supabase SQL Editor:
```sql
SELECT 
  policyname,
  cmd,
  roles,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;
```

Look for the policy named "Authenticated users can view scan sessions for their patients"

### Step 2: Test with a Simple Policy
Replace the complex policy with a super simple one to isolate the issue:

```sql
-- Drop the complex policy
DROP POLICY IF EXISTS "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions;

-- Create a simple policy that allows ALL authenticated users (for testing only)
CREATE POLICY "Test: All authenticated users" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (true);
```

After running this:
1. Refresh your app
2. Try to view adherence logs
3. If it works, the problem was with the complex policy subquery
4. If it still fails, the problem is something else

### Step 3: Check Your User Roles
Run this to see your current user's roles:
```sql
SELECT 
  ura.user_id,
  ur.name as role_name,
  ur.organization_id,
  ur.facility_id
FROM user_role_assignments ura
JOIN user_roles ur ON ur.id = ura.role_id
WHERE ura.user_id = auth.uid();
```

If this returns empty, you don't have any roles assigned, which would cause the policy to fail.

### Step 4: Test the Policy Logic Directly
Run this to test if the policy subquery works:
```sql
-- Replace YOUR_PATIENT_ID with an actual patient ID
SELECT p.id 
FROM patients p
LEFT JOIN user_role_assignments ura ON ura.user_id = auth.uid()
LEFT JOIN user_roles ur ON ur.id = ura.role_id
WHERE (
  ur.name = 'simpiller_admin'
  OR (ur.name = 'organization_admin' AND p.organization_id = ur.organization_id)
  OR (ur.name = 'provider' AND p.assigned_provider_id = auth.uid())
)
AND p.id = 'YOUR_PATIENT_ID';
```

If this returns empty, the policy logic isn't matching your user.

### Step 5: Check Browser Console for Full Error
In the browser console, look for the full error object that should show:
```
[Compliance] Error fetching scan sessions: {
  error: {...},
  message: "...",
  details: "...",
  hint: "...",
  code: "..."
}
```

The `message`, `details`, and `hint` fields will tell us exactly what's wrong.

## Quick Fix Options

### Option A: Use Simple Policy (Temporary)
If you just need it to work now, use the simple policy:
```sql
CREATE POLICY "All authenticated users can view" ON medication_scan_sessions
  FOR SELECT TO authenticated USING (true);
```

### Option B: Fix the Complex Policy
The issue might be:
1. `auth.uid()` not working in the policy context
2. Missing role assignments for your user
3. Table/column references incorrect

### Option C: Match Existing Policy Style
Look at how the existing "Anyone can view scan sessions by token" policy is written and match that style.

## What to Share
Please share:
1. The output of the policy check query (Step 1)
2. The full error object from browser console (Step 5)
3. The output of your user roles query (Step 3)

This will help diagnose the exact issue.
