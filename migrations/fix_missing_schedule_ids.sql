-- Fix Missing Schedule IDs in Medication Logs
-- This script attempts to match medication_logs that are missing schedule_id
-- to the correct medication_schedules based on medication_id and patient_id
--
-- The issue: Some medication_logs were created without schedule_id, causing
-- the frontend to infer incorrect scheduled times (e.g., assuming 6pm for evening scans)
--
-- This script will:
-- 1. Find logs missing schedule_id or with invalid schedule_id
-- 2. Attempt to match them to active schedules for the same medication/patient
-- 3. Update the logs with the correct schedule_id

-- Step 1: Create a temporary table to track what we're going to fix
CREATE TEMP TABLE IF NOT EXISTS logs_to_fix AS
SELECT 
    ml.id as log_id,
    ml.medication_id,
    ml.patient_id,
    ml.event_date,
    ml.status,
    ml.schedule_id as current_schedule_id,
    -- Try to find the correct schedule_id
    (
        SELECT ms.id
        FROM medication_schedules ms
        WHERE ms.medication_id = ml.medication_id
          AND ms.is_active = true
        ORDER BY ms.created_at DESC
        LIMIT 1
    ) as correct_schedule_id
FROM medication_logs ml
WHERE 
    -- Logs missing schedule_id
    (ml.schedule_id IS NULL)
    OR
    -- Logs with schedule_id that doesn't exist or is inactive
    (
        ml.schedule_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1
            FROM medication_schedules ms
            WHERE ms.id = ml.schedule_id
              AND ms.is_active = true
        )
    );

-- Step 2: Show summary of what we found
SELECT 
    COUNT(*) as total_logs_to_fix,
    COUNT(correct_schedule_id) as logs_with_matching_schedule,
    COUNT(*) - COUNT(correct_schedule_id) as logs_without_matching_schedule
FROM logs_to_fix;

-- Step 3: Show breakdown by status
SELECT 
    status,
    COUNT(*) as count,
    COUNT(correct_schedule_id) as can_be_fixed
FROM logs_to_fix
GROUP BY status
ORDER BY count DESC;

-- Step 4: Show logs that were scanned in evening hours (17:00-21:59) - these are the ones
-- that were likely incorrectly inferred as 6pm in the display
SELECT 
    COUNT(*) as evening_logs_missing_schedule,
    COUNT(correct_schedule_id) as evening_logs_with_match
FROM logs_to_fix
WHERE EXTRACT(HOUR FROM event_date::timestamp) >= 17
  AND EXTRACT(HOUR FROM event_date::timestamp) < 22;

-- Step 5: Preview what will be updated (first 20 rows)
SELECT 
    lt.log_id,
    lt.medication_id,
    lt.patient_id,
    lt.event_date,
    lt.status,
    lt.current_schedule_id,
    lt.correct_schedule_id,
    m.name as medication_name,
    p.first_name || ' ' || p.last_name as patient_name
FROM logs_to_fix lt
LEFT JOIN medications m ON m.id = lt.medication_id
LEFT JOIN patients p ON p.id = lt.patient_id
WHERE lt.correct_schedule_id IS NOT NULL
ORDER BY lt.event_date DESC
LIMIT 20;

-- Step 6: ACTUAL UPDATE (uncomment to run)
-- This will update all logs that have a matching schedule
/*
UPDATE medication_logs ml
SET schedule_id = lt.correct_schedule_id
FROM logs_to_fix lt
WHERE ml.id = lt.log_id
  AND lt.correct_schedule_id IS NOT NULL
  AND ml.schedule_id IS DISTINCT FROM lt.correct_schedule_id;

-- Show how many were updated
SELECT 
    COUNT(*) as logs_updated
FROM logs_to_fix
WHERE correct_schedule_id IS NOT NULL;
*/

-- Step 7: For logs that still can't be matched, we can't fix them automatically
-- These will need manual review or will be handled by the new frontend logic
SELECT 
    lt.log_id,
    lt.medication_id,
    lt.patient_id,
    lt.event_date,
    lt.status,
    m.name as medication_name,
    p.first_name || ' ' || p.last_name as patient_name,
    -- Check if medication has any schedules (active or inactive)
    (
        SELECT COUNT(*)
        FROM medication_schedules ms
        WHERE ms.medication_id = lt.medication_id
    ) as total_schedules_for_medication,
    -- Check if medication is still active
    m.status as medication_status
FROM logs_to_fix lt
LEFT JOIN medications m ON m.id = lt.medication_id
LEFT JOIN patients p ON p.id = lt.patient_id
WHERE lt.correct_schedule_id IS NULL
ORDER BY lt.event_date DESC
LIMIT 50;

-- Cleanup
DROP TABLE IF EXISTS logs_to_fix;

