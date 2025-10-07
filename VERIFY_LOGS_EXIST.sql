-- Quick check: Do medication_logs actually exist for Oct 5-7?

-- 1. Count logs by date for last 7 days
SELECT 
  DATE(event_date) as log_date,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN status = 'taken' THEN 1 END) as taken,
  COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed
FROM medication_logs
WHERE event_date >= '2025-10-01'
GROUP BY DATE(event_date)
ORDER BY log_date DESC;

-- 2. Show actual logs from Oct 5-7
SELECT 
  event_date,
  status,
  patient_id,
  medication_id,
  source,
  created_at
FROM medication_logs
WHERE event_date >= '2025-10-05'
  AND event_date < '2025-10-08'
ORDER BY event_date DESC
LIMIT 20;

-- 3. Check if logs exist but medications are deleted (causing join to fail)
SELECT 
  ml.event_date,
  ml.status,
  ml.patient_id,
  ml.medication_id,
  m.id as med_exists,
  m.name as med_name
FROM medication_logs ml
LEFT JOIN medications m ON m.id = ml.medication_id
WHERE ml.event_date >= '2025-10-05'
  AND ml.event_date < '2025-10-08'
ORDER BY ml.event_date DESC
LIMIT 20;

