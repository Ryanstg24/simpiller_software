-- Verification Script: Check Schedule ID Fix Results
-- Run this after executing the fix to verify everything worked correctly

-- 1. Overall Status: How many logs now have valid schedule_id?
SELECT 
    COUNT(*) as total_logs,
    COUNT(schedule_id) as logs_with_schedule_id,
    COUNT(*) - COUNT(schedule_id) as logs_still_missing_schedule,
    ROUND(100.0 * COUNT(schedule_id) / COUNT(*), 2) as percentage_with_schedule
FROM medication_logs;

-- 2. Check for logs with invalid schedule_id (should be 0 or very few)
SELECT 
    COUNT(*) as logs_with_invalid_schedule_id
FROM medication_logs ml
WHERE ml.schedule_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.id = ml.schedule_id
        AND ms.is_active = true
  );

-- 3. Breakdown by status
SELECT 
    status,
    COUNT(*) as total,
    COUNT(schedule_id) as with_schedule,
    COUNT(*) - COUNT(schedule_id) as without_schedule
FROM medication_logs
GROUP BY status
ORDER BY total DESC;

-- 4. Recent logs (last 7 days) - should mostly have schedule_id now
SELECT 
    DATE(event_date) as log_date,
    COUNT(*) as total_logs,
    COUNT(schedule_id) as with_schedule,
    COUNT(*) - COUNT(schedule_id) as without_schedule
FROM medication_logs
WHERE event_date >= NOW() - INTERVAL '7 days'
GROUP BY DATE(event_date)
ORDER BY log_date DESC;

-- 5. Logs that still can't be fixed (no matching schedule exists)
-- These are expected and will be handled by the new frontend logic
SELECT 
    COUNT(*) as logs_without_matching_schedule,
    COUNT(DISTINCT medication_id) as unique_medications_affected,
    COUNT(DISTINCT patient_id) as unique_patients_affected
FROM medication_logs ml
WHERE ml.schedule_id IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM medication_schedules ms
      WHERE ms.medication_id = ml.medication_id
        AND ms.is_active = true
  );

-- 6. Sample of logs that still can't be fixed (for review)
SELECT 
    ml.id,
    ml.medication_id,
    ml.patient_id,
    ml.event_date,
    ml.status,
    m.name as medication_name,
    m.status as medication_status,
    p.first_name || ' ' || p.last_name as patient_name,
    (
        SELECT COUNT(*)
        FROM medication_schedules ms
        WHERE ms.medication_id = ml.medication_id
    ) as total_schedules_for_medication,
    (
        SELECT COUNT(*)
        FROM medication_schedules ms
        WHERE ms.medication_id = ml.medication_id
          AND ms.is_active = true
    ) as active_schedules_for_medication
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
LIMIT 20;

-- 7. Check evening logs (17:00-21:59) - these were the ones incorrectly showing as 6pm
SELECT 
    COUNT(*) as evening_logs_total,
    COUNT(schedule_id) as evening_logs_with_schedule,
    COUNT(*) - COUNT(schedule_id) as evening_logs_without_schedule,
    ROUND(100.0 * COUNT(schedule_id) / COUNT(*), 2) as percentage_fixed
FROM medication_logs
WHERE EXTRACT(HOUR FROM event_date::timestamp) >= 17
  AND EXTRACT(HOUR FROM event_date::timestamp) < 22;

-- 8. Verify schedules are correctly matched (sample check)
SELECT 
    ml.id as log_id,
    ml.event_date,
    ml.status,
    m.name as medication_name,
    ms.time_of_day as scheduled_time,
    EXTRACT(HOUR FROM ml.event_date::timestamp) as scan_hour,
    EXTRACT(HOUR FROM (ms.time_of_day::time)) as scheduled_hour
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
JOIN medications m ON m.id = ml.medication_id
WHERE ml.schedule_id IS NOT NULL
  AND ml.event_date >= NOW() - INTERVAL '7 days'
ORDER BY ml.event_date DESC
LIMIT 20;

