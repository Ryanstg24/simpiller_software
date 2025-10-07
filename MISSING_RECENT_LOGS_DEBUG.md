# Debugging Missing Recent Logs (Oct 5-6)

## Problem
Adherence logs are showing up to October 4th, but October 5th and 6th logs are missing for all patients.

## Possible Causes

### 1. Logs Aren't Being Created
**Most likely:** If patients haven't been scanning in the last 2 days, no logs would be created.

**Check:** Run the SQL in `CHECK_RECENT_LOGS.sql` to see if ANY logs exist from Oct 5-6.

### 2. Scan Sessions Aren't Being Created
If the cron job that creates scan sessions isn't running, no QR codes would be generated.

**Check:** Query #4 in `CHECK_RECENT_LOGS.sql` shows recent scan sessions.

### 3. RLS Policy Blocking Recent Logs
Unlikely, but if there's a date-based RLS policy, it could be filtering.

**Check:** Try the query as an admin in Supabase SQL Editor (bypasses RLS).

### 4. Timezone Issues
If `event_date` is stored in one timezone but filtered in another, recent logs might be excluded.

**Check:** Look at the raw `event_date` values in the database.

---

## Debug Steps

### Step 1: Check Browser Console
I've added debug logging to show:
- Total number of logs fetched
- Date range (newest to oldest)
- Sample of most recent 3 logs

**Open the adherence logs tab and check the console for:**
```
[Adherence] Raw logs from database: X records
[Adherence] Date range: { newest: ..., oldest: ..., today: ... }
[Adherence] Most recent 3 logs: [...]
```

This will tell us if:
- ✅ Logs exist in the database but aren't being shown (data issue)
- ❌ Logs don't exist in the database (creation issue)

### Step 2: Run SQL Queries
Open Supabase SQL Editor and run queries from `CHECK_RECENT_LOGS.sql`:

**Query #1:** Shows the 20 most recent logs
- If none from Oct 5-6, logs aren't being created

**Query #2:** Shows daily log counts for last 7 days
- Should show entries for each day
- If Oct 5-6 are missing, no scans happened

**Query #4:** Shows recent scan sessions
- If none scheduled for Oct 5-6, the cron job isn't running

### Step 3: Check Cron Job
If scan sessions aren't being created, check:

1. **Vercel Cron Job:** Is `/api/cron/create-scan-sessions` running?
2. **Logs:** Check Vercel logs for cron execution
3. **Schedule:** Ensure cron is configured correctly

### Step 4: Check Patient Scan Activity
Ask yourself:
- Have patients actually been **using** the app on Oct 5-6?
- Were QR codes sent out via SMS?
- Did anyone click the scan links?

---

## Quick Test

### Create a Test Log Manually
Run this in Supabase SQL Editor to create a test log for today:

```sql
-- Replace with actual patient_id and medication_id
INSERT INTO medication_logs (
  patient_id,
  medication_id,
  event_date,
  status,
  source,
  created_at
) VALUES (
  'YOUR_PATIENT_ID',
  'YOUR_MEDICATION_ID',
  NOW(),
  'taken',
  'manual_test',
  NOW()
);
```

Then refresh the adherence logs tab. If the test log shows up:
- ✅ The query is working
- ❌ Real logs aren't being created

---

## What to Share

Please share:
1. **Console output** from the debug logs
2. **Results** from SQL Query #2 (daily counts)
3. **Whether scan sessions exist** for Oct 5-6 (Query #4)

This will pinpoint if it's:
- A data creation issue (cron job not running)
- A query issue (logs exist but aren't showing)
- An activity issue (no one scanned)

