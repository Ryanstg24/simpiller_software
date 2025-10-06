# Debug: Why Completed Session Shows as Expired

## Problem
The 11:15 AM session was successfully scanned, but shows as "Expired" instead of "Completed".

## Possible Causes

### 1. Time Window Too Narrow
**Before:** Only checked scans AFTER scheduled time
```typescript
.gte('event_date', session.scheduled_time)  // Must be after scheduled time
.lte('event_date', scheduled_time + 2 hours)
```

**Problem:** What if someone scans 5 minutes EARLY (11:10 AM for an 11:15 AM session)?
- ❌ Query misses it because 11:10 < 11:15

**Fix:** Allow 30 minutes before scheduled time
```typescript
.gte('event_date', scheduled_time - 30 minutes)  // ✅ Now catches early scans
.lte('event_date', scheduled_time + 2 hours)
```

### 2. Medication ID Mismatch
The query checks:
```typescript
.in('medication_id', session.medication_ids)
```

**Problem:** If medication IDs in the session don't match medication IDs in the logs
- Session says medications: `[uuid-1, uuid-2]`
- Logs have: `[uuid-3, uuid-4]`
- ❌ No match found

**Possible causes:**
- Medications were changed after session was created
- Wrong medication IDs in the session
- Logs using different medication IDs

### 3. Event Date Format Issue
**Problem:** Timezone or date format mismatch
- Session: `2025-10-06T11:15:00Z` (UTC)
- Log: `2025-10-06T11:15:00-04:00` (EDT)
- Comparison might fail

### 4. Status Field Issue
**Problem:** Log status isn't exactly 'taken'
- Could be: `'Taken'` (capitalized)
- Could be: `'completed'` (different value)
- Could be: `null` or empty

---

## Debug Steps

### Step 1: Check Browser Console
After the code update, refresh the adherence logs page and look for:
```
[Compliance] DEBUG 11:15 session: {
  session_id: "...",
  scheduled: "2025-10-06T11:15:00Z",
  medication_ids: ["uuid-1", "uuid-2"],
  windowStart: "2025-10-06T10:45:00Z",
  windowEnd: "2025-10-06T13:15:00Z",
  found_logs: 0,  // ← If 0, logs weren't found
  logs: [],
  error: null
}
```

### Step 2: Check Medication Logs in Database
Run this query in Supabase:
```sql
-- Find logs for this patient around 11:15 AM
SELECT 
  id,
  medication_id,
  event_date,
  status,
  qr_code_scanned
FROM medication_logs
WHERE patient_id = 'YOUR_PATIENT_ID'
  AND event_date >= '2025-10-06 10:45:00'
  AND event_date <= '2025-10-06 13:15:00'
ORDER BY event_date;
```

### Step 3: Compare Medication IDs
```sql
-- Get medication IDs from scan session
SELECT 
  id,
  medication_ids,
  scheduled_time
FROM medication_scan_sessions
WHERE scheduled_time >= '2025-10-06 11:00:00'
  AND scheduled_time <= '2025-10-06 12:00:00';

-- Compare with medication_logs
-- Do the medication_ids in the array match the logs?
```

---

## What the Fix Does

### 1. Expanded Time Window
- **Before:** Only AFTER scheduled time
- **After:** 30 min before to 2 hours after
- ✅ Catches early scans

### 2. Better Debugging
Added console logs to show:
- Session details
- Time window being checked
- Medication IDs being searched
- Number of logs found
- Any errors

---

## Testing

1. **Refresh the adherence logs page**
2. **Check browser console** for the DEBUG log
3. **Share the console output** to diagnose further

The debug log will tell us exactly why the medication_logs aren't being found!

---

## Expected Results

If the log is found:
```javascript
found_logs: 1,  // ✅
logs: [{ id: "...", event_date: "...", medication_id: "..." }]
```
→ Session should show as "✅ Completed"

If the log is NOT found:
```javascript
found_logs: 0,  // ❌
logs: []
```
→ We need to investigate WHY (medication ID mismatch? time issue? status issue?)
