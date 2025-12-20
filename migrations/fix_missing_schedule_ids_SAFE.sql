-- SAFE VERSION: Fix Missing Schedule IDs in Medication Logs
-- This version only shows what would be fixed without making changes
-- Run this first to review what will be updated, then run the actual fix script

-- Find logs missing schedule_id or with invalid schedule_id
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
    ) as correct_schedule_id,
    m.name as medication_name,
    p.first_name || ' ' || p.last_name as patient_name,
    -- Show the scheduled time if we find a match
    (
        SELECT ms.time_of_day
        FROM medication_schedules ms
        WHERE ms.medication_id = ml.medication_id
          AND ms.is_active = true
        ORDER BY ms.created_at DESC
        LIMIT 1
    ) as scheduled_time
FROM medication_logs ml
LEFT JOIN medications m ON m.id = ml.medication_id
LEFT JOIN patients p ON p.id = ml.patient_id
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
    )
ORDER BY ml.event_date DESC
LIMIT 100;

-- Summary statistics
SELECT 
    COUNT(*) as total_logs_missing_schedule,
    COUNT(
        CASE WHEN EXISTS (
            SELECT 1
            FROM medication_schedules ms
            WHERE ms.medication_id = ml.medication_id
              AND ms.is_active = true
        ) THEN 1 END
    ) as logs_with_available_schedule,
    COUNT(
        CASE WHEN NOT EXISTS (
            SELECT 1
            FROM medication_schedules ms
            WHERE ms.medication_id = ml.medication_id
              AND ms.is_active = true
        ) THEN 1 END
    ) as logs_without_available_schedule,
    COUNT(
        CASE WHEN EXTRACT(HOUR FROM ml.event_date::timestamp) >= 17
             AND EXTRACT(HOUR FROM ml.event_date::timestamp) < 22
        THEN 1 END
    ) as evening_logs_affected
FROM medication_logs ml
WHERE 
    (ml.schedule_id IS NULL)
    OR
    (
        ml.schedule_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1
            FROM medication_schedules ms
            WHERE ms.id = ml.schedule_id
              AND ms.is_active = true
        )
    );

