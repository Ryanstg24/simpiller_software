# Backfill Historical Scans

## Problem
After adding `completed_at`, new scans will work correctly. But what about sessions that were **already scanned** before we added the column?

## Solution
**Backfill** the `completed_at` timestamps by looking at the `medication_logs` table.

---

## 🔍 How It Works

When someone scans a QR code, the system creates entries in **two tables**:

1. **`medication_scan_sessions`** - The session record (currently missing `completed_at`)
2. **`medication_logs`** - Individual medication records (with `event_date` and `qr_code_scanned`)

We can **match them up** to backfill the missing timestamps!

---

## 🚀 Run This SQL to Backfill

**File:** `migrations/backfill_completed_at_from_logs.sql`

Or copy this SQL:

```sql
-- Add the column
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Backfill from medication_logs
UPDATE medication_scan_sessions mss
SET completed_at = (
  SELECT MIN(ml.event_date)
  FROM medication_logs ml
  WHERE ml.patient_id = mss.patient_id
    AND ml.status = 'taken'
    AND ml.qr_code_scanned IS NOT NULL
    AND ml.event_date >= mss.scheduled_time
    AND ml.event_date <= (mss.scheduled_time + INTERVAL '2 hours')
    AND ml.medication_id = ANY(mss.medication_ids)
)
WHERE completed_at IS NULL
  AND is_active = false
  AND EXISTS (
    SELECT 1
    FROM medication_logs ml
    WHERE ml.patient_id = mss.patient_id
      AND ml.status = 'taken'
      AND ml.qr_code_scanned IS NOT NULL
      AND ml.event_date >= mss.scheduled_time
      AND ml.event_date <= (mss.scheduled_time + INTERVAL '2 hours')
      AND ml.medication_id = ANY(mss.medication_ids)
  );
```

---

## 📊 What This Does

### Matching Logic:
1. **Same patient** (`patient_id` matches)
2. **Same medication** (medication in the session's `medication_ids` array)
3. **Same time window** (log created within 2 hours after scheduled time)
4. **Actual scan** (`qr_code_scanned` is not null)
5. **Status is 'taken'** (not missed or skipped)

### Result:
- Sets `completed_at` to the **earliest scan time** for that session
- Only updates sessions that have matching logs
- Sessions without matching logs remain `null` (expired)

---

## 🎯 Expected Results

### Before Backfill:
```
Session 1: scheduled=9am, is_active=false, completed_at=null → Shows "Expired" ❌
Session 2: scheduled=1pm, is_active=false, completed_at=null → Shows "Expired" ❌
```

### After Backfill (if they were scanned):
```
Session 1: scheduled=9am, is_active=false, completed_at=9:05am → Shows "Completed" ✅
Session 2: scheduled=1pm, is_active=false, completed_at=null   → Shows "Expired" ❌
```

---

## ⚠️ Important Notes

### Sessions That CAN Be Backfilled:
✅ Scanned via QR code (has `medication_logs` entry)
✅ Within reasonable time window (2 hours)
✅ Medication IDs match

### Sessions That CANNOT Be Backfilled:
❌ Actually expired (never scanned)
❌ Scanned but logs were deleted
❌ Scanned more than 2 hours after scheduled time (edge case)

---

## 🧪 Testing the Backfill

After running the backfill SQL, check the results:

```sql
-- How many sessions were backfilled?
SELECT 
  COUNT(*) as total_sessions,
  COUNT(completed_at) as sessions_with_completed_at,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND is_active = false) as expired
FROM medication_scan_sessions;
```

---

## 🎉 Final Steps

1. **Run:** `migrations/add_completed_at_only.sql` (adds column)
2. **Run:** `migrations/backfill_completed_at_from_logs.sql` (backfills historical data)
3. **Refresh the app**
4. **Check adherence logs** - historical scans should now show as "Completed"!

---

## Summary

- ✅ Adds `completed_at` column
- ✅ Backfills from `medication_logs` for historical scans
- ✅ Future scans automatically populate `completed_at`
- ✅ All sessions now show correct status (completed vs expired)
