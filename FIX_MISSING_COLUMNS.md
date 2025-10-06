# Fix: 400 Error - Missing Columns in medication_scan_sessions

## Root Cause Found! ✅

The code is trying to `SELECT` columns that **don't exist** in the `medication_scan_sessions` table, causing a 400 error.

### Missing Columns:
- ❌ `status` - Required by code, cron job, and API routes
- ❌ `completed_at` - Required by code and API routes
- ❌ `updated_at` - Required by code

### Why This Happened:
When we migrated from the `session_logs` table to using `medication_scan_sessions` directly, we didn't add all the necessary columns to the table schema.

---

## 🚀 Fix: Add Missing Columns

Run this SQL in Supabase SQL Editor:

```sql
-- Add status column (tracks session completion status)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'completed', 'failed', 'expired'));

-- Add completed_at column (timestamp when session was completed)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at column (track last update time)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger to auto-update updated_at column
CREATE OR REPLACE TRIGGER update_medication_scan_sessions_updated_at
  BEFORE UPDATE ON medication_scan_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## What These Columns Do

### `status` (VARCHAR(20))
- Tracks the session completion status
- Values: `'pending'`, `'completed'`, `'failed'`, `'expired'`
- Updated by:
  - `/api/scan/log-success` → sets to `'completed'` when scanned
  - `/api/cron/process-expired-sessions` → sets to `'expired'` when timeout
- Used by: Adherence logs to show if session was taken or missed

### `completed_at` (TIMESTAMP)
- Records when the session was completed (medication scanned)
- Set by `/api/scan/log-success` when patient scans QR code
- Used by: Compliance calculations and adherence log display

### `updated_at` (TIMESTAMP)
- Auto-updated timestamp whenever row is modified
- Managed by trigger (same pattern as other tables)
- Used by: Tracking last modification time

---

## After Running the Migration

1. **Refresh your app** (hard refresh: Cmd+Shift+R)
2. **Open a patient** → go to **Adherence Logs** tab
3. **Check console** - should see:
   ```
   [Compliance] Successfully fetched scan sessions: <count>
   ```

No more 400 errors! ✅

---

## Update Existing Data

If you have existing scan sessions, you may want to update their status:

```sql
-- Update existing sessions based on is_active and expires_at
UPDATE medication_scan_sessions
SET status = CASE
  WHEN is_active = false AND completed_at IS NOT NULL THEN 'completed'
  WHEN is_active = false AND expires_at < NOW() THEN 'expired'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';
```

---

## Verify Columns Were Added

Run this to confirm all columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'medication_scan_sessions'
ORDER BY ordinal_position;
```

You should see all these columns:
- ✅ id
- ✅ patient_id
- ✅ session_token
- ✅ medication_ids
- ✅ scheduled_time
- ✅ expires_at
- ✅ is_active
- ✅ created_at
- ✅ **status** ← NEW
- ✅ **completed_at** ← NEW
- ✅ **updated_at** ← NEW

---

## Why This Will Fix Everything

1. ✅ Code can now SELECT all columns without 400 error
2. ✅ Cron job can UPDATE status to 'expired'
3. ✅ API routes can UPDATE status to 'completed' and set completed_at
4. ✅ Adherence logs can display taken/missed status
5. ✅ RLS policies will work (they were never the problem)

---

## Files Updated

- `migrations/add_missing_scan_session_columns.sql` - Migration to add columns
- `FIX_MISSING_COLUMNS.md` - This documentation

The code doesn't need any changes - it was already written correctly. The database schema was just missing columns!
