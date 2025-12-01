-- SAFE VERSION: Preview Mismatched Event Dates
-- This shows what will be changed without making any updates
-- Run this first to review before executing the fix

-- Show detailed breakdown of mismatched logs
SELECT 
    ml.id as log_id,
    ml.event_date as current_event_date,
    ms.time_of_day as scheduled_time,
    ml.status,
    m.name as medication_name,
    p.first_name || ' ' || p.last_name as patient_name,
    EXTRACT(HOUR FROM ml.event_date::timestamp) as current_hour,
    EXTRACT(HOUR FROM (ms.time_of_day::time)) as scheduled_hour,
    ABS(
        EXTRACT(HOUR FROM ml.event_date::timestamp) - 
        EXTRACT(HOUR FROM (ms.time_of_day::time))
    ) as hour_difference,
    -- Show what the corrected event_date would be
    (
        DATE(ml.event_date) || ' ' || ms.time_of_day
    )::timestamp as corrected_event_date
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
JOIN medications m ON m.id = ml.medication_id
LEFT JOIN patients p ON p.id = ml.patient_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  -- Check if the hour doesn't match (allowing for some timezone/rounding differences)
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1  -- More than 1 hour difference
  AND ml.status = 'missed'  -- These are typically from expired sessions
ORDER BY hour_difference DESC, ml.event_date DESC
LIMIT 100;

-- Summary by hour difference
SELECT 
    CASE 
        WHEN ABS(
            EXTRACT(HOUR FROM ml.event_date::timestamp) - 
            EXTRACT(HOUR FROM (ms.time_of_day::time))
        ) BETWEEN 2 AND 5 THEN '2-5 hours'
        WHEN ABS(
            EXTRACT(HOUR FROM ml.event_date::timestamp) - 
            EXTRACT(HOUR FROM (ms.time_of_day::time))
        ) BETWEEN 6 AND 11 THEN '6-11 hours'
        WHEN ABS(
            EXTRACT(HOUR FROM ml.event_date::timestamp) - 
            EXTRACT(HOUR FROM (ms.time_of_day::time))
        ) >= 12 THEN '12+ hours'
        ELSE 'Other'
    END as difference_category,
    COUNT(*) as log_count
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1
  AND ml.status = 'missed'
GROUP BY difference_category
ORDER BY log_count DESC;

-- Show breakdown by scheduled time period
SELECT 
    CASE 
        WHEN EXTRACT(HOUR FROM (ms.time_of_day::time)) BETWEEN 5 AND 11 THEN 'Morning (5-11)'
        WHEN EXTRACT(HOUR FROM (ms.time_of_day::time)) BETWEEN 12 AND 16 THEN 'Afternoon (12-16)'
        WHEN EXTRACT(HOUR FROM (ms.time_of_day::time)) BETWEEN 17 AND 21 THEN 'Evening (17-21)'
        ELSE 'Bedtime/Night (22-4)'
    END as scheduled_period,
    COUNT(*) as mismatched_logs
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1
  AND ml.status = 'missed'
GROUP BY scheduled_period
ORDER BY mismatched_logs DESC;

-- Show sample of the most extreme mismatches
SELECT 
    ml.id as log_id,
    ml.event_date as current_event_date,
    ms.time_of_day as scheduled_time,
    m.name as medication_name,
    ABS(
        EXTRACT(HOUR FROM ml.event_date::timestamp) - 
        EXTRACT(HOUR FROM (ms.time_of_day::time))
    ) as hour_difference,
    (
        DATE(ml.event_date) || ' ' || ms.time_of_day
    )::timestamp as corrected_event_date
FROM medication_logs ml
JOIN medication_schedules ms ON ms.id = ml.schedule_id
JOIN medications m ON m.id = ml.medication_id
WHERE ml.schedule_id IS NOT NULL
  AND ms.is_active = true
  AND ABS(
      EXTRACT(HOUR FROM ml.event_date::timestamp) - 
      EXTRACT(HOUR FROM (ms.time_of_day::time))
  ) > 1
  AND ml.status = 'missed'
ORDER BY ABS(
    EXTRACT(HOUR FROM ml.event_date::timestamp) - 
    EXTRACT(HOUR FROM (ms.time_of_day::time))
) DESC
LIMIT 20;

