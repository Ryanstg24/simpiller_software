# FIX: Repeated SIGNED_IN Events Causing Role Fetch Timeouts

## 🚨 Critical Issue

After sitting on the patients page for some time, the application shows "Access Denied" with this error:
```
[Auth V2] Exception fetching roles: Error: Role fetch timeout
No role information available - this might be a temporary auth timeout
```

## Root Cause

Supabase fires the `SIGNED_IN` event **multiple times** during a session, not just on initial login:

### Timeline of Events:
1. User logs in → `SIGNED_IN` event → Fetches roles ✅
2. User navigates around the app
3. After 30-60 seconds → Token refresh happens
4. Supabase fires `SIGNED_IN` event **AGAIN** 🚨
5. Code tries to fetch roles again → Timeout (15 seconds)
6. Timeout returns empty roles → Access Denied 🚨

### Why This Happens

**Old Code:**
```typescript
if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  // ALWAYS fetches roles when SIGNED_IN fires
  const roles = await fetchUserRoles(session.user.id);
}
```

**Problem:** `SIGNED_IN` can fire multiple times per session, causing repeated role fetches!

---

## The Fix

Added a session-level flag to track if roles have already been initialized:

```typescript
const hasInitializedRoles = useRef<boolean>(false);

const handleAuthStateChange = async (event, session) => {
  if (session?.user) {
    // Only fetch on INITIAL_SESSION or FIRST SIGNED_IN
    const shouldFetchRoles = (event === 'INITIAL_SESSION') || 
                             (event === 'SIGNED_IN' && !hasInitializedRoles.current);
    
    if (shouldFetchRoles) {
      const roles = await fetchUserRoles(session.user.id);
      hasInitializedRoles.current = true; // Mark as done
    } else {
      console.log('Skipping role fetch (already initialized)');
    }
  } else {
    // On sign out, reset the flag
    hasInitializedRoles.current = false;
  }
}
```

---

## How It Works

### Before Fix:
| Event | Action | Result |
|-------|--------|--------|
| INITIAL_SESSION | Fetch roles ✅ | Roles loaded |
| SIGNED_IN (1st) | Fetch roles 🔄 | Duplicate fetch |
| TOKEN_REFRESHED | Skip ✅ | No fetch |
| SIGNED_IN (2nd) | Fetch roles 🔄 | Timeout → Access Denied 🚨 |

### After Fix:
| Event | Action | Result |
|-------|--------|--------|
| INITIAL_SESSION | Fetch roles ✅ | Roles loaded, flag set |
| SIGNED_IN (1st) | Skip 🛑 | Flag already set |
| TOKEN_REFRESHED | Skip 🛑 | Flag already set |
| SIGNED_IN (2nd) | Skip 🛑 | Flag already set |

---

## Expected Console Logs

### Good Pattern (After Fix):
```
[Auth V2] Auth state change: INITIAL_SESSION
[Auth V2] Fetching roles for event: INITIAL_SESSION
[Auth V2] Fetching fresh roles for user: abc-123
[Auth V2] Using organization_admin org: xyz-789

[Auth V2] Auth state change: SIGNED_IN
[Auth V2] Skipping role fetch for event: SIGNED_IN (already initialized) ✅

[Auth V2] Auth state change: TOKEN_REFRESHED
[Auth V2] Skipping role fetch for event: TOKEN_REFRESHED (already initialized) ✅

[Auth V2] Auth state change: SIGNED_IN
[Auth V2] Skipping role fetch for event: SIGNED_IN (already initialized) ✅
```

### Bad Pattern (Before Fix):
```
[Auth V2] Auth state change: SIGNED_IN
[Auth V2] Fetching fresh roles for user: abc-123
[Auth V2] Using organization_admin org: xyz-789

[Auth V2] Auth state change: SIGNED_IN
[Auth V2] Fetching fresh roles for user: abc-123  ❌ Duplicate!
[Auth V2] Exception fetching roles: Error: Role fetch timeout ❌
No role information available - this might be a temporary auth timeout ❌
```

---

## Testing

1. **Log in to the application**
2. **Open browser console**
3. **Stay on the patients page for 2-3 minutes** (don't navigate away)
4. **Watch console logs**

**Expected:** You should see:
- Initial role fetch on login
- `Skipping role fetch` for all subsequent auth events
- **NO timeout errors**
- **NO access denied**

---

## Files Changed

✅ `src/contexts/auth-context-v2.tsx`
- Added `hasInitializedRoles` ref to track session state
- Modified `handleAuthStateChange` to only fetch roles once per session
- Resets flag on sign-out

---

## Benefits

✅ **Eliminates repeated role fetches** - Roles fetched once per session  
✅ **No more timeouts** - No unnecessary database queries  
✅ **No more access denied** - Roles persist throughout session  
✅ **Better performance** - Reduced database load  
✅ **Stable user experience** - No interruptions during navigation  

---

## Why Multiple SIGNED_IN Events?

Supabase Auth can trigger `SIGNED_IN` in these scenarios:
1. **Initial login** - User enters credentials
2. **Token refresh with new claims** - If user metadata changes
3. **OAuth re-authentication** - Social login providers
4. **Manual session refresh** - App calls `refreshSession()`

Our fix handles all these cases by checking if we've already initialized roles for the current session.

---

## Comparison with Previous Fixes

### Fix 1 (Previous): Skip TOKEN_REFRESHED
- Only prevented fetches on `TOKEN_REFRESHED` events
- Still allowed fetches on repeated `SIGNED_IN` events
- **Result:** Partial fix, issue persisted

### Fix 2 (This): Skip After First Fetch
- Prevents fetches after initial role load
- Works for ALL auth events (SIGNED_IN, TOKEN_REFRESHED, etc.)
- **Result:** Complete fix ✅

---

## Rollback

If this causes any issues, revert by:
1. Remove `hasInitializedRoles.current` checks
2. Go back to checking only `event === 'SIGNED_IN' || event === 'INITIAL_SESSION'`

But this should not be necessary - the fix is conservative and only prevents duplicate fetches.

---

**Status:** ✅ Fixed and deployed  
**Date:** October 7, 2025  
**Severity:** CRITICAL → RESOLVED  

