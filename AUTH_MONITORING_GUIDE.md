# Auth System Monitoring Guide

## 🔍 Quick Health Check

Open browser console and look for these patterns:

### ✅ **Healthy System**
```
[Auth V2] Auth state change: INITIAL_SESSION
[Auth V2] Fetching fresh roles for user: abc-123
[Auth V2] Auth state change: TOKEN_REFRESHED
[Auth V2] Using cached roles (age: 35s)
[Auth V2] Auth state change: TOKEN_REFRESHED
[Auth V2] Using cached roles (age: 95s)
```
**What this means:** 
- Roles fetched once on load
- Token refreshes use cached roles (no DB queries)
- No timeouts or errors

---

### ⚠️ **Warning Signs**
```
[Auth V2] Exception fetching roles: Error: Role fetch timeout
[Auth V2] Keeping existing roles due to fetch error
```
**What this means:**
- Database queries are slow (>15 seconds)
- System is recovering gracefully by keeping cached roles
- User experience is preserved, but investigate database performance

**Action Items:**
- Check database performance
- Look at query execution times in Supabase dashboard
- Consider database indexing improvements

---

### 🚨 **Critical Issues**
```
[Auth V2] Exception fetching roles: Error: Role fetch timeout
[Auth V2] No role assignments found for user: abc-123
Access Denied screen appears
```
**What this means:**
- User has no roles assigned OR
- Database connection is failing completely

**Action Items:**
- Check if user has roles in `user_role_assignments` table
- Verify database connectivity
- Check Supabase dashboard for errors
- Review RLS policies

---

## 📊 **Console Log Reference**

| Log Message | Frequency | What It Means |
|-------------|-----------|---------------|
| `[Auth V2] Fetching fresh roles` | Once per login | Initial role fetch |
| `[Auth V2] Using cached roles` | Every 30-60s | Cache hit (good!) |
| `[Auth V2] Auth state change: TOKEN_REFRESHED` | Every 30-60s | Normal Supabase behavior |
| `[Auth V2] Auth state change: SIGNED_IN` | Once per login | User just logged in |
| `[Auth V2] Exception fetching roles` | Never/Rare | Database issue |
| `[Auth V2] Keeping existing roles` | Never/Rare | Graceful error recovery |

---

## 🧪 **Quick Tests**

### Test 1: Role Caching
1. Log in to the application
2. Open browser console
3. Wait 60 seconds (do nothing)
4. Check console logs

**Expected:** Should see `Using cached roles` messages, NOT `Fetching fresh roles`

---

### Test 2: Token Refresh Stability
1. Log in to the application
2. Navigate to patients page
3. Wait 2-3 minutes
4. Try to interact with the page (open a patient, etc.)

**Expected:** No "Access Denied" errors, smooth interaction

---

### Test 3: Error Recovery
1. Turn off internet connection briefly (5 seconds)
2. Turn it back on
3. Try to use the application

**Expected:** Application recovers gracefully, doesn't log you out

---

## 🔧 **Common Issues & Solutions**

### Issue: "Access Denied" appearing randomly
**Likely Cause:** Role fetch timing out
**Check:**
```sql
-- Check if user has roles assigned
SELECT u.email, ur.name, ura.assigned_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.email = 'user@example.com';
```
**Solution:** 
- Verify user has roles in database
- Check database query performance
- Increase timeout if database is consistently slow (in `auth-context-v2.tsx`)

---

### Issue: Too many database queries
**Likely Cause:** Cache not working
**Check:** Console logs for `Fetching fresh roles` appearing too often
**Solution:**
- Verify cache TTL is 5 minutes (300000 ms)
- Check if `lastRoleFetchTime` is being updated correctly
- Look for forced refreshes (`forceRefresh: true`)

---

### Issue: Password change modal appearing on every page load
**Likely Cause:** Password requirement being checked too frequently
**Check:** Console logs for password-related queries
**Solution:**
- Verify password check only happens on `SIGNED_IN` event
- Check database for user's `password_change_required` flag
- Update flag after password change

---

## 📈 **Performance Metrics**

### Before Improvements
- **DB Queries per minute:** ~4 (2 for roles, 2 for password check)
- **Timeouts per session:** 2-3
- **Access Denied errors:** Frequent

### After Improvements (Expected)
- **DB Queries per minute:** ~0.5 (mostly cached)
- **Timeouts per session:** 0
- **Access Denied errors:** None

---

## 🎯 **Key Performance Indicators**

Monitor these over time:

1. **Auth-related database queries** - should be minimal
2. **User complaints about "Access Denied"** - should be zero
3. **Console timeout errors** - should be rare/never
4. **Session stability** - users should stay logged in reliably

---

## 🚨 **When to Escalate**

Contact development team if:
- Access denied errors persist after these changes
- Console shows repeated timeout errors (>5 per hour)
- Users report being logged out unexpectedly
- Database queries for auth remain high (>2 per minute)

---

## 📝 **Quick Debug Commands**

### Check user's roles in database:
```sql
SELECT 
  u.email,
  ur.name as role_name,
  ur.organization_id,
  ura.assigned_at
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.email = 'user@example.com';
```

### Check password change requirement:
```sql
SELECT 
  email,
  password_change_required,
  created_at,
  last_sign_in_at
FROM users
WHERE email = 'user@example.com';
```

### Check recent auth activity:
```sql
SELECT 
  email,
  last_sign_in_at,
  created_at,
  is_active
FROM users
ORDER BY last_sign_in_at DESC
LIMIT 10;
```

---

**Last Updated:** October 7, 2025

