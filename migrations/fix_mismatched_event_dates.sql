-- Fix Mismatched Event Dates in Medication Logs
-- Issue: Some "missed" logs have event_date that doesn't match their scheduled_time
-- This happens when expired sessions create missed logs with incorrect event_date values
--
-- This script will:
-- 1. Find logs where event_date doesn't match scheduled_time
-- 2. Update event_date to match the scheduled_time from the schedule

-- Step 1: Find logs with mismatched event_date and scheduled_time
-- (Only for logs that have a valid schedule_id)
SELECT 
    ml.id as log_id,
    ml.event_date as current_event_date,
    ms.time_of_day as scheduled_time,
    ml.status,
    m.name as medication_name,
    -- Calculate what the event_date should be (same date, but time from schedule)
    (
        DATE(ml.event_date) || ' ' || ms.time_of_day
    )::timestamp as corrected_event_date
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
JOIN medications m ON m.id = ml.medication_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  -- Check if the hour doesn't match (allowing for some timezone/rounding differences)
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1  -- More than 1 hour difference
  AND ml.status = 'missed'  -- These are typically from expired sessions
ORDER BY ml.event_date DESC
LIMIT 50;

-- Step 2: Count how many would be affected
SELECT 
    COUNT(*) as logs_with_mismatched_times
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1
  AND ml.status = 'missed';

-- Step 3: ACTUAL UPDATE (uncomment to run)
-- This updates event_date to match the scheduled_time from the schedule
-- Uses the same date as the current event_date, but corrects the time
/*
UPDATE medication_logs ml
SET event_date = (
    DATE(ml.event_date) || ' ' || ms.time_of_day
)::timestamp
FROM medication_schedules ms
WHERE ml.schedule_id = ms.id
  AND ms.is_active = true
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1
  AND ml.status = 'missed';

-- Show how many were updated
SELECT 
    COUNT(*) as logs_updated
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ml.status = 'missed'
  AND ml.updated_at > NOW() - INTERVAL '1 minute';
*/

-- Step 4: Verify the fix worked
SELECT 
    ml.id as log_id,
    ml.event_date as corrected_event_date,
    ms.time_of_day as scheduled_time,
    EXTRACT(HOUR FROM ml.event_date::timestamp) as event_hour,
    EXTRACT(HOUR FROM (ms.time_of_day::time)) as scheduled_hour,
    ABS(
        EXTRACT(HOUR FROM ml.event_date::timestamp) - 
        EXTRACT(HOUR FROM (ms.time_of_day::time))
    ) as hour_difference
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ml.status = 'missed'
  AND ml.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY ml.event_date DESC
LIMIT 20;

