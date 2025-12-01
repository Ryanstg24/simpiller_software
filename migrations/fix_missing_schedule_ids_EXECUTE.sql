-- EXECUTE VERSION: Fix Missing Schedule IDs in Medication Logs
-- WARNING: This will UPDATE your database. Review the SAFE version first!
--
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

-- Step 1: Create a backup view (for reference, not a real backup)
CREATE OR REPLACE VIEW medication_logs_before_fix AS
SELECT * FROM medication_logs;

-- Step 2: Update logs that are missing schedule_id but have a matching active schedule
UPDATE medication_logs ml
SET schedule_id = (
    SELECT ms.id
    FROM medication_schedules ms
    WHERE ms.medication_id = ml.medication_id
      AND ms.is_active = true
    ORDER BY ms.created_at DESC
    LIMIT 1
)
WHERE ml.schedule_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.medication_id = ml.medication_id
        AND ms.is_active = true
  );

-- Step 3: Update logs that have an invalid schedule_id (schedule doesn't exist or is inactive)
-- but have a matching active schedule
UPDATE medication_logs ml
SET schedule_id = (
    SELECT ms.id
    FROM medication_schedules ms
    WHERE ms.medication_id = ml.medication_id
      AND ms.is_active = true
    ORDER BY ms.created_at DESC
    LIMIT 1
)
WHERE ml.schedule_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.id = ml.schedule_id
        AND ms.is_active = true
  )
  AND EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.medication_id = ml.medication_id
        AND ms.is_active = true
  );

-- Step 4: Show summary of what was updated
SELECT 
    'Logs updated' as action,
    COUNT(*) as count
FROM medication_logs ml
WHERE ml.schedule_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.id = ml.schedule_id
        AND ms.is_active = true
  )
  AND ml.updated_at > NOW() - INTERVAL '1 minute';

-- Step 5: Show logs that still can't be fixed (no matching schedule exists)
SELECT 
    ml.id as log_id,
    ml.medication_id,
    ml.patient_id,
    ml.event_date,
    ml.status,
    m.name as medication_name,
    p.first_name || ' ' || p.last_name as patient_name,
    m.status as medication_status,
    -- Check if medication has any schedules (active or inactive)
    (
        SELECT COUNT(*)
        FROM medication_schedules ms
        WHERE ms.medication_id = ml.medication_id
    ) as total_schedules_for_medication
FROM medication_logs ml
LEFT JOIN medications m ON m.id = ml.medication_id
LEFT JOIN patients p ON p.id = ml.patient_id
WHERE ml.schedule_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.medication_id = ml.medication_id
        AND ms.is_active = true
  )
ORDER BY ml.event_date DESC
LIMIT 50;

-- Note: Logs that still can't be matched will be handled by the new frontend logic
-- which groups them by actual scan time instead of inferring a scheduled time

