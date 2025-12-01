# Fix Missing Schedule IDs in Medication Logs

## Problem
Some medication logs were created without `schedule_id` or with invalid `schedule_id` values. This caused the frontend to incorrectly infer scheduled times (e.g., assuming 6pm for evening scans), leading to medications appearing at times patients don't actually have scheduled.

## Solution
These SQL scripts attempt to match medication logs to the correct schedules based on `medication_id` and `patient_id`, then update the logs with the correct `schedule_id`.

## Files

### 1. `fix_missing_schedule_ids_SAFE.sql` ⚠️ **RUN THIS FIRST**
- **Purpose:** Preview what will be fixed without making any changes
- **Action:** READ-ONLY queries
- **Use:** Review the results to understand what will be updated

### 2. `fix_missing_schedule_ids_EXECUTE.sql` ⚠️ **RUN THIS TO APPLY FIXES**
- **Purpose:** Actually updates the database
- **Action:** UPDATE statements
- **Use:** Run after reviewing the SAFE version results

### 3. `fix_missing_schedule_ids.sql`
- **Purpose:** Comprehensive analysis with temporary tables
- **Action:** Analysis queries (commented UPDATE at the end)
- **Use:** For deeper investigation if needed

## How to Use

### Step 1: Review What Will Be Fixed
```sql
-- Run the SAFE version first
\i migrations/fix_missing_schedule_ids_SAFE.sql
```

This will show you:
- Logs missing `schedule_id`
- Logs with invalid `schedule_id` (schedule doesn't exist or is inactive)
- Which logs can be automatically fixed (have matching schedules)
- Which logs cannot be fixed (no matching schedule exists)
- Breakdown by status and time of day

### Step 2: Review the Results
Check:
- How many logs will be updated
- Which medications/patients are affected
- Whether the matches look correct

### Step 3: Execute the Fix (if results look good)
```sql
-- Run the EXECUTE version
\i migrations/fix_missing_schedule_ids_EXECUTE.sql
```

This will:
- Update logs missing `schedule_id` with matching active schedules
- Update logs with invalid `schedule_id` with matching active schedules
- Show a summary of what was updated
- List logs that still can't be fixed

## What Gets Fixed

### ✅ Can Be Fixed Automatically
- Logs with `schedule_id = NULL` that have a matching active schedule
- Logs with `schedule_id` pointing to non-existent or inactive schedules, but have a matching active schedule

### ❌ Cannot Be Fixed Automatically
- Logs for medications that have no active schedules
- Logs for medications that were deleted/deactivated
- These will be handled by the new frontend logic (grouped by scan time, not inferred scheduled time)

## Matching Logic

The script matches logs to schedules using:
1. Same `medication_id`
2. Schedule must be `is_active = true`
3. If multiple schedules exist, uses the most recently created one (`ORDER BY created_at DESC`)

## Safety Notes

1. **Backup First:** Always backup your database before running UPDATE statements
2. **Review First:** Always run the SAFE version first to see what will change
3. **Test Environment:** Test in a development/staging environment first
4. **Logs That Can't Be Fixed:** These are expected - the new frontend code handles them gracefully

## After Running

After executing the fix:
1. The frontend will no longer infer incorrect scheduled times
2. Logs with valid `schedule_id` will show correct scheduled times
3. Logs without `schedule_id` will be grouped by actual scan time with a warning

## Verification

To verify the fix worked:
```sql
-- Check how many logs still have missing/invalid schedule_id
SELECT 
    COUNT(*) as logs_missing_schedule,
    COUNT(CASE WHEN schedule_id IS NULL THEN 1 END) as null_schedule_id,
    COUNT(CASE WHEN schedule_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM medication_schedules ms 
        WHERE ms.id = ml.schedule_id AND ms.is_active = true
    ) THEN 1 END) as invalid_schedule_id
FROM medication_logs ml;
```

## Related Code Changes

This SQL fix works in conjunction with the frontend fix in:
- `src/components/patients/compliance-log-tab.tsx`
- The new logic groups logs by actual scan time when schedule info is missing
- No longer infers 6pm for evening scans

