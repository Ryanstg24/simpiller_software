-- Diagnostic query to check Donna English's medication logs
-- Patient ID: 1643282c

-- Count total logs
SELECT 
    COUNT(*) as total_logs,
    MIN(event_date) as earliest_log,
    MAX(event_date) as latest_log
FROM medication_logs
WHERE patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d';

-- Count logs before Nov 27
SELECT 
    COUNT(*) as logs_before_nov27
FROM medication_logs
WHERE patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d'
  AND event_date < '2025-11-27';

-- Count logs on/after Nov 27
SELECT 
    COUNT(*) as logs_on_or_after_nov27
FROM medication_logs
WHERE patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d'
  AND event_date >= '2025-11-27';

-- Show the 100 most recent logs (what the UI is currently fetching)
SELECT 
    event_date,
    status,
    medication_id,
    schedule_id
FROM medication_logs
WHERE patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d'
ORDER BY event_date DESC
LIMIT 100;

-- Show logs that are being excluded (older than the 100th most recent)
WITH recent_100 AS (
    SELECT event_date
    FROM medication_logs
    WHERE patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d'
    ORDER BY event_date DESC
    LIMIT 100
)
SELECT 
    ml.event_date,
    ml.status,
    ml.medication_id,
    ml.schedule_id
FROM medication_logs ml
WHERE ml.patient_id = '1643282c-355d-4384-a0d2-d67d32e94e2d'
  AND ml.event_date < (SELECT MIN(event_date) FROM recent_100)
ORDER BY ml.event_date DESC
LIMIT 20;

