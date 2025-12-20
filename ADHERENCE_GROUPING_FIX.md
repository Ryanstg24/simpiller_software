# Adherence Log Grouping Issue - Root Cause and Fix

## Problem Description
Medications scheduled for 8:00 PM were being incorrectly grouped into a 6:00 PM time slot, resulting in a "Taken (Late)" status when they were actually taken on time. All medications were scanned at 8:02 PM, but some were being displayed in a separate 6:00 PM accordion box.

## Root Cause
The issue was in the Supabase query in `compliance-log-tab.tsx`. The query was using:

```typescript
medication_schedules (
  time_of_day
)
```

When Supabase PostgREST processes this join syntax, it tries to infer the foreign key relationship. If there are multiple relationships between `medication_logs` and `medication_schedules` (e.g., via `medication_id` and via `schedule_id`), Supabase might join on the wrong relationship.

**The key problem:** Supabase was likely joining `medication_schedules` by `medication_id` instead of `schedule_id`, which could return:
1. An old schedule for the medication (if schedules were updated)
2. The wrong schedule if a medication has multiple schedules
3. An active schedule that doesn't match the log's `schedule_id`

This caused medications to be grouped by the wrong scheduled time, leading to incorrect "Taken (Late)" statuses and split accordion boxes.

## Solution
The fix explicitly fetches schedules separately by `schedule_id` and matches them manually:

1. **Fetch logs without the join** - Get all medication logs first
2. **Fetch schedules separately** - Query `medication_schedules` filtered by the `schedule_id` values from the logs
3. **Manual matching** - Match each log to its correct schedule using `schedule_id` as the key

This ensures that:
- Each log gets the schedule that matches its `schedule_id`
- Medications are grouped by their actual scheduled time
- The "Taken (Late)" status is calculated correctly based on the actual scheduled time

## Code Changes
- **File:** `src/components/patients/compliance-log-tab.tsx`
- **Lines:** 112-194
- **Key change:** Removed the automatic Supabase join and replaced it with explicit fetching and matching

## Testing
To verify the fix:
1. Check the browser console for `[Adherence]` logs to see schedule matching
2. Verify that medications scanned at the same time are grouped together
3. Verify that the scheduled time matches the patient's actual time preferences
4. Use the debug endpoint: `/api/debug/adherence-investigation?patientId=<patient_id>&date=2025-11-05`

## Additional Notes
- The fix also adds better logging to help identify any logs that have a `schedule_id` but no matching schedule
- If a log doesn't have a `schedule_id`, the code falls back to inferring the scheduled time (existing behavior)
- The debug endpoint at `/api/debug/adherence-investigation` can help investigate similar issues in the future

