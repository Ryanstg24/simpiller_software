# Patient Update Timeout Debugging

## Issue
Patient updates timeout after the page has been open for a while, even for simple updates like changing a phone number.

## Root Cause Analysis

### Likely Causes:
1. **RLS Policy Performance** - Row Level Security policies doing expensive joins
2. **Stale Session** - Auth session not refreshing properly
3. **Database Connection** - Connection pool exhaustion
4. **Index Missing** - Missing indexes on RLS policy columns

## Changes Made

### 1. Session Validation (Line 268-275)
```typescript
// Check if session is still valid before attempting update
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError || !session) {
  alert('Your session has expired. Please refresh the page and try again.');
  return;
}
```

### 2. Better Logging (Line 320-329)
```typescript
const startTime = Date.now();
const updatePromise = supabase
  .from('patients')
  .update(updateData)
  .eq('id', patient.id)
  .then(result => {
    const duration = Date.now() - startTime;
    console.log(`Update completed in ${duration}ms`);
    return result;
  });
```

### 3. Increased Timeout (Line 336)
Changed from 8 seconds to 15 seconds to accommodate slower queries.

## Next Steps for Investigation

### 1. Check RLS Policies in Supabase Dashboard

Run this query in Supabase SQL Editor:

```sql
-- Check if RLS is enabled on patients table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'patients';

-- View all policies on patients table
SELECT * FROM pg_policies WHERE tablename = 'patients';
```

### 2. Check for Missing Indexes

```sql
-- Check indexes on patients table
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'patients';

-- Check if organization_id has an index (important for RLS)
SELECT * FROM pg_indexes 
WHERE tablename = 'patients' 
AND indexdef LIKE '%organization_id%';
```

### 3. Test Query Performance

```sql
-- Test how long a simple update takes
EXPLAIN ANALYZE
UPDATE patients 
SET phone1 = '561-350-9346' 
WHERE id = 'YOUR_PATIENT_ID';
```

### 4. Check Session Token Age

In browser console when the timeout happens:
```javascript
// Check session age
const { data: { session } } = await supabase.auth.getSession();
console.log('Session expires at:', new Date(session.expires_at * 1000));
console.log('Current time:', new Date());
console.log('Time until expiry:', (session.expires_at * 1000 - Date.now()) / 1000 / 60, 'minutes');
```

## Potential Fixes

### Option 1: Optimize RLS Policies
If RLS policies are doing expensive joins, optimize them:

```sql
-- Example: Add index on commonly joined columns
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id 
ON user_role_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id 
ON user_roles(organization_id);
```

### Option 2: Force Session Refresh
Add session refresh before long-running operations:

```typescript
// Force refresh session if it's getting old
const { data: { session } } = await supabase.auth.getSession();
if (session && session.expires_at) {
  const timeUntilExpiry = session.expires_at * 1000 - Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (timeUntilExpiry < fiveMinutes) {
    console.log('Session expiring soon, refreshing...');
    await supabase.auth.refreshSession();
  }
}
```

### Option 3: Use Service Role for Updates
If RLS is the bottleneck, consider using a server-side API route with service role:

```typescript
// Instead of direct Supabase update
const response = await fetch('/api/patients/update', {
  method: 'POST',
  body: JSON.stringify({ patientId: patient.id, updateData })
});
```

## Monitoring

After deploying the changes, monitor the console logs:

1. **"Session is valid, proceeding with update"** - Session check passed
2. **"Update completed in Xms"** - Shows actual update duration
3. **"Update timed out after Xms"** - Shows when timeout occurred

If you see:
- **< 1000ms** - Normal, should work fine
- **1000-5000ms** - Slow, investigate RLS policies
- **> 5000ms** - Very slow, likely RLS or index issue
- **Timeout at 15000ms** - Critical issue, needs immediate fix

## Testing

To reproduce and test:
1. Open patient details modal
2. Wait 5-10 minutes without interacting
3. Try to update a simple field (like phone number)
4. Check console for timing logs
5. If it times out, check session validity in console

## Related Files
- `src/components/patients/patient-details-modal.tsx` - Patient update logic
- `src/lib/supabase.ts` - Supabase client configuration
- `supabase_schema.sql` - Database schema and RLS policies
