# Fix: Auth Timeout Every 30 Seconds / Access Denied

## Problem
After being on the patients page for ~30 seconds, you get "Access Denied" and these console errors:
```
[Auth V2] Exception fetching password change requirement: Error: Password check timeout
[Auth V2] Exception fetching roles: Error: Role fetch timeout
```

## Root Cause
Supabase automatically refreshes auth tokens every ~30-60 seconds. Each refresh triggers `onAuthStateChange`, which was fetching roles and password requirements **every single time**, causing:
1. ❌ Unnecessary database queries every 30 seconds
2. ❌ Timeouts when queries are slow
3. ❌ Access denied when roles fail to fetch

## Solution
Only fetch roles on **actual sign-in events**, not on token refresh.

---

## What Changed

### Before (problematic):
```typescript
handleAuthStateChange = (event, session) => {
  if (session?.user) {
    // ALWAYS fetches roles, even on token refresh
    fetchUserRoles(session.user.id);
    fetchPasswordChangeRequired(session.user.id);
  }
}
```
❌ **Problem:** Runs on every `TOKEN_REFRESHED` event (every 30 seconds)

### After (fixed):
```typescript
handleAuthStateChange = (event, session) => {
  if (session?.user) {
    // ONLY fetch on sign-in, not on token refresh
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      fetchUserRoles(session.user.id);
      fetchPasswordChangeRequired(session.user.id);
    }
    // For TOKEN_REFRESHED, keep existing roles (no DB query)
  }
}
```
✅ **Solution:** Roles fetched once on login, then reused

---

## Auth Events Explained

Supabase triggers these events:

| Event | When | Old Behavior | New Behavior |
|-------|------|--------------|--------------|
| `INITIAL_SESSION` | Page load with existing session | ✅ Fetch roles | ✅ Fetch roles |
| `SIGNED_IN` | User logs in | ✅ Fetch roles | ✅ Fetch roles |
| `TOKEN_REFRESHED` | Every 30-60 seconds | ❌ Fetch roles (timeout!) | ✅ Keep existing roles |
| `SIGNED_OUT` | User logs out | ✅ Clear roles | ✅ Clear roles |

---

## Why This Fixes It

### Before:
1. User views patients page
2. After 30 seconds → token refresh
3. `onAuthStateChange('TOKEN_REFRESHED')` fires
4. Tries to fetch roles → timeout (3-5 seconds)
5. Sets roles to `[]` on error
6. User loses permissions → "Access Denied"

### After:
1. User views patients page  
2. After 30 seconds → token refresh
3. `onAuthStateChange('TOKEN_REFRESHED')` fires
4. **Skips role fetch** → keeps existing roles in state
5. User keeps permissions → No access denied! ✅

---

## Benefits

✅ **No more timeouts** - Roles only fetched once on login
✅ **Better performance** - No unnecessary DB queries every 30 seconds
✅ **No access denied** - Roles persist between token refreshes
✅ **Faster page load** - Reduced database load

---

## Testing

After deploying:
1. Open patients page
2. Wait 60+ seconds
3. Try to interact (view patient, edit, etc.)
4. ✅ Should work without "Access Denied"
5. ✅ Console should NOT show timeout errors every 30 seconds

---

## Files Updated

- ✅ `src/contexts/auth-context-v2.tsx` - Only fetch roles on sign-in events

---

## Summary

**Problem:** Fetching roles on every token refresh (every 30 seconds)
**Solution:** Only fetch roles on actual sign-in, reuse them on token refresh
**Result:** No more timeouts, no more access denied! 🎉
