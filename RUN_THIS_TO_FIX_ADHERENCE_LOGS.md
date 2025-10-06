# Fix Adherence Logs 400 Error - FINAL SOLUTION

## The Problem
The adherence logs aren't loading because the `medication_scan_sessions` table only has policies for **unauthenticated (public)** access, not for **authenticated users**.

## The Solution
Add a policy for authenticated users using the **same pattern that works for the medications table**.

---

## 🚀 Run This Entire SQL File in Supabase

**File:** `migrations/add_authenticated_scan_session_policies.sql`

Or copy/paste this SQL:

```sql
-- First, drop the policy if it exists (in case it was created incorrectly before)
DROP POLICY IF EXISTS "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions;

-- Add policy for authenticated users to view scan sessions for their patients
-- Using EXISTS pattern (same as medications table policies - this pattern is proven to work!)
CREATE POLICY "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (
    -- Simpiller admins can view all scan sessions
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND ur.name = 'simpiller_admin'
    )
    OR
    -- Organization admins can view scan sessions for patients in their organization
    EXISTS (
      SELECT 1 FROM patients p
      JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE p.id = medication_scan_sessions.patient_id
      AND ur.name = 'organization_admin'
      AND p.organization_id = ur.organization_id
    )
    OR
    -- Providers can view scan sessions for their assigned patients
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_scan_sessions.patient_id
      AND p.assigned_provider_id = auth.uid()
    )
  );

-- Verify all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;
```

---

## Why This Works

This uses the **exact same pattern** as the medications table policies, which you confirmed are working.

### Key Differences from Previous Attempt:
1. ✅ Uses `EXISTS` instead of `IN` (more efficient, better for RLS)
2. ✅ Breaks logic into 3 separate `OR` conditions (clearer, easier to debug)
3. ✅ References `medication_scan_sessions.patient_id` directly in subqueries
4. ✅ Matches the proven working pattern from medications table

### What Each Condition Does:
- **Condition 1:** Simpiller admins see ALL scan sessions
- **Condition 2:** Org admins see scan sessions for patients in THEIR organization
- **Condition 3:** Providers see scan sessions for patients ASSIGNED to them

---

## After Running the SQL

1. **Refresh your app** (hard refresh: Cmd+Shift+R)
2. **Open a patient** → go to **Adherence Logs** tab
3. **Check console** - should see:
   ```
   [Compliance] Successfully fetched scan sessions: <count>
   ```

No more 400 errors! ✅

---

## Expected Policies After This

You should have **4 total policies** on `medication_scan_sessions`:

| Policy Name | Role | Command | Purpose |
|-------------|------|---------|---------|
| Anyone can view scan sessions by token | public | SELECT | QR code scanning |
| System can insert scan sessions | public | INSERT | Cron job creates sessions |
| System can update scan sessions | public | UPDATE | API updates sessions |
| **Authenticated users can view scan sessions for their patients** | **authenticated** | **SELECT** | **Dashboard adherence logs** ✅ |

---

## If It Still Doesn't Work

Run this diagnostic:

```sql
-- Check your user roles
SELECT 
  ura.user_id,
  ur.name as role_name,
  ur.organization_id
FROM user_role_assignments ura
JOIN user_roles ur ON ur.id = ura.role_id
WHERE ura.user_id = auth.uid();
```

If this returns empty, you don't have any roles assigned, which would prevent access.

---

## Confidence Level: HIGH ✅

This is using the **exact same pattern** that's working for medications, so it should work for scan sessions too!
