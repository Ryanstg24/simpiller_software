# Auth Performance Fix - Patients Page Loading Issue

## Problem
The patients page was stuck on a black "Loading..." screen indefinitely. The auth context was causing the app to hang.

## Root Cause
**Infinite Re-render Loop in Auth Context**

The `useEffect` in `auth-context-v2.tsx` had `initializeAuth` and `handleAuthStateChange` in its dependency array:

```typescript
useEffect(() => {
  initializeAuth();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
  return () => subscription.unsubscribe();
}, [initializeAuth, handleAuthStateChange]); // ❌ BAD - causes infinite loop
```

**Why this caused infinite loading:**
1. Component mounts → effect runs → auth initializes
2. `initializeAuth` and `handleAuthStateChange` are `useCallback` functions
3. These callbacks depend on `fetchUserRoles` and `fetchPasswordChangeRequired`
4. When state updates (setUserRoles, setUser, etc.), the callbacks get recreated
5. New callbacks → effect deps change → effect re-runs
6. **Infinite loop** → auth keeps re-initializing → page never finishes loading

## Fixes Applied

### 1. Fixed Infinite Loop (PRIMARY FIX)
```typescript
useEffect(() => {
  initializeAuth();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
  return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ✅ GOOD - only run once on mount
```

**Impact:** Auth now initializes once and only responds to actual auth state changes (login/logout), not internal state updates.

### 2. Added Timeouts to Prevent Hanging
In case database queries are slow, added timeouts:

**Role Fetching (5 seconds):**
```typescript
const timeoutPromise = new Promise<never>((_, reject) => 
  setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
);
const fetchPromise = (async () => { /* fetch roles */ })();
return await Promise.race([fetchPromise, timeoutPromise]);
```

**Password Check (3 seconds):**
```typescript
const timeoutPromise = new Promise<never>((_, reject) => 
  setTimeout(() => reject(new Error('Password check timeout')), 3000)
);
const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
```

**Impact:** Even if RLS policies are slow, auth will timeout and return defaults instead of hanging forever.

### 3. Reduced Patients Query Timeout
Changed from 60 seconds to 10 seconds:
```typescript
const { data, error } = await withTimeout(
  query as unknown as Promise<SupabaseResponse<Patient>>,
  10000, // 10 seconds - reasonable timeout
  'Patients load timed out'
);
```

**Impact:** If patients query is slow, user gets an error faster instead of waiting a minute.

### 4. Removed Excessive Console Logging
Removed verbose logs that were slowing down the browser:
- `console.log('[Auth V2] Fetching user roles for:', userId);`
- `console.log('[Auth V2] Raw data from database:', data);`
- `console.log('[Auth V2] User roles fetched successfully:', roles);`

**Impact:** Less console spam, faster rendering.

## Expected Performance After Fix
- **Auth initialization**: < 1 second
- **Patients page load**: 1-3 seconds
- **No infinite loading**: Page should never hang indefinitely

## Testing
1. Navigate to `/patients`
2. Page should load within 3 seconds
3. Check browser console - should NOT see repeated auth logs
4. Auth should only initialize once per page load

## If Still Slow
If the page is still slow after this fix, the issue is likely:
1. **Slow RLS policies** - Check Supabase logs for slow queries
2. **Missing database indexes** - Add indexes on `user_role_assignments(user_id)`, `user_roles(id)`, `patients(organization_id, is_active)`
3. **Network issues** - Check Network tab in DevTools for slow API calls

## Files Changed
- `src/contexts/auth-context-v2.tsx` - Fixed infinite loop, added timeouts
- `src/hooks/use-patients.ts` - Reduced query timeout from 60s to 10s

## Deployment
These changes are safe to deploy immediately. They fix a critical performance bug without changing any business logic.
