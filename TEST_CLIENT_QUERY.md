# Test Client Query - Check if 400 Error is from Supabase Client

## The Issue
Even with `USING (true)` policy, you're getting a 400 error. This suggests the problem might be:
1. The Supabase client isn't sending auth credentials properly
2. The auth token is expired/invalid
3. There's a mismatch between the policy and how the client is authenticating

## Test in Browser Console

Open the browser console on the adherence logs page and run this:

```javascript
// Test 1: Check if auth is working
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
console.log('Current session:', session);
console.log('Session error:', sessionError);
console.log('User ID:', session?.user?.id);

// Test 2: Try to query scan sessions directly
const { data, error } = await supabase
  .from('medication_scan_sessions')
  .select('*')
  .limit(5);
console.log('Scan sessions data:', data);
console.log('Scan sessions error:', error);

// Test 3: Try medications (we know this works)
const { data: meds, error: medsError } = await supabase
  .from('medications')
  .select('*')
  .limit(5);
console.log('Medications data:', meds);
console.log('Medications error:', medsError);
```

## What the Results Mean

### If Test 1 shows no session or error:
- **Problem:** Auth isn't working at all
- **Solution:** Need to fix auth context issue

### If Test 2 returns 400 error but Test 3 works:
- **Problem:** Something specific to `medication_scan_sessions` table
- **Possible causes:**
  - Table doesn't exist
  - Column name mismatch
  - RLS is blocking even with `USING (true)`

### If both Test 2 and Test 3 fail:
- **Problem:** General Supabase client issue
- **Solution:** Check Supabase configuration

### If Test 2 returns empty array (not error):
- **Problem:** No data exists in the table
- **Solution:** Need to create scan sessions first

## Next Steps Based on Results

Share the console output from these tests and we can diagnose the exact issue!
