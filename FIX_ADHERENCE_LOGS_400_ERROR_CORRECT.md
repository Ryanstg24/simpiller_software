# Fix: Adherence Logs 400 Error (CORRECT DIAGNOSIS)

## Problem
The adherence logs (scan sessions) are not loading and showing a 400 error:
```
Failed to load resource: the server responded with a status of 400
Error fetching scan sessions: Object
```

## Root Cause (CORRECTED)
The `medication_scan_sessions` table HAS RLS policies, but they are for **PUBLIC (unauthenticated) access** only:
- "Anyone can view scan sessions by token" → For QR code scanning (unauthenticated)
- "System can insert scan sessions" → For cron jobs
- "System can update scan sessions" → For API routes

**The issue:** When **authenticated users** (admins, providers) try to view adherence logs, there's NO policy allowing them to query by `patient_id`. The existing policies only allow access by `session_token`.

## Solution
Add a new RLS policy for **authenticated users** to query scan sessions by patient ID.

---

## 🚀 Quick Fix: Run This SQL in Supabase

### Step 1: Go to Supabase SQL Editor
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Create a new query

### Step 2: Run This SQL
```sql
-- Add policy for authenticated users to view scan sessions for their patients
CREATE POLICY "Authenticated users can view scan sessions for their patients" ON medication_scan_sessions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      LEFT JOIN user_role_assignments ura ON ura.user_id = auth.uid()
      LEFT JOIN user_roles ur ON ur.id = ura.role_id
      WHERE (
        ur.name = 'simpiller_admin' -- Simpiller admins see all
        OR (ur.name = 'organization_admin' AND p.organization_id = ur.organization_id) -- Org admins see their org
        OR (ur.name = 'provider' AND p.assigned_provider_id = auth.uid()) -- Providers see their patients
      )
    )
  );
```

### Step 3: Verify All Policies
Run this to see all policies:
```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'medication_scan_sessions'
ORDER BY policyname;
```

You should now see **4 policies**:
1. "Anyone can view scan sessions by token" (SELECT, public) - For QR scanning
2. "System can insert scan sessions" (INSERT, public) - For cron jobs
3. "System can update scan sessions" (UPDATE, public) - For API routes
4. **"Authenticated users can view scan sessions for their patients" (SELECT, authenticated)** ← NEW

---

## What This Policy Does

The new policy allows:
- **Simpiller Admins**: View ALL scan sessions
- **Organization Admins**: View scan sessions for patients in their organization
- **Providers**: View scan sessions for their assigned patients

This policy is only for **authenticated** users (logged-in admins/providers), separate from the public QR scanning flow.

---

## Why We Need Both Public and Authenticated Policies

### Public Policies (Existing)
- **For:** QR code scanning by patients (unauthenticated)
- **Access by:** `session_token`
- **Use case:** Patient scans QR code → system verifies token → allows access

### Authenticated Policies (New)
- **For:** Dashboard users (admins, providers)
- **Access by:** `patient_id` + user role
- **Use case:** Admin views patient's adherence logs → system checks role → allows access

Both are needed because:
- Patients (unauthenticated) access by token
- Admins/Providers (authenticated) access by patient ID

---

## Testing

After running the SQL:

1. **Refresh the page** (hard refresh: Cmd+Shift+R)
2. **Open a patient** and go to the **Adherence Logs** tab
3. **Check browser console** - you should see:
   ```
   [Compliance] Fetching scan sessions for patient: <patient-id>
   [Compliance] Successfully fetched scan sessions: <count>
   ```

No more 400 errors! ✅

---

## Alternative: Quick Test to Verify This is the Issue

Run this query in Supabase SQL Editor to test if the policy is missing:

```sql
-- This should work (you're authenticated)
SELECT COUNT(*) 
FROM medication_scan_sessions
WHERE patient_id = '<your-test-patient-id>';
```

If it returns `0` or an error about RLS, that confirms the missing authenticated policy is the issue.

---

## Files Created

1. **`migrations/add_authenticated_scan_session_policies.sql`** - Migration to add the missing policy
2. **`FIX_ADHERENCE_LOGS_400_ERROR_CORRECT.md`** - This guide

---

## Summary

**Problem:** Existing RLS policies only allow `public` (unauthenticated) access by token. Authenticated users can't query by `patient_id`.

**Solution:** Add a new policy specifically for `authenticated` users that allows querying by `patient_id` based on their role.

**Impact:** 
- ✅ QR code scanning still works (public policies unchanged)
- ✅ Admins/providers can now view adherence logs (new authenticated policy)
- ✅ Maintains proper security (role-based access control)
