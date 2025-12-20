-- Diagnostic query to check for duplicate medication logs on December 8th, 2025
-- This will help identify if logs are being created multiple times for the same scan

-- Find all logs on December 8th, 2025 around 2:00 PM (14:00 UTC or local time)
-- Group by patient, medication, and event_date to find duplicates
SELECT 
  ml.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  ml.medication_id,
  m.name AS medication_name,
  ml.event_date,
  ml.event_key,
  ml.status,
  ml.schedule_id,
  COUNT(*) as log_count,
  ARRAY_AGG(ml.id ORDER BY ml.created_at) as log_ids,
  ARRAY_AGG(ml.created_at ORDER BY ml.created_at) as created_times
FROM medication_logs ml
JOIN patients p ON ml.patient_id = p.id
LEFT JOIN medications m ON ml.medication_id = m.id
WHERE DATE(ml.event_date) = '2025-12-08'
  AND EXTRACT(HOUR FROM ml.event_date) = 14  -- 2:00 PM
GROUP BY 
  ml.patient_id,
  p.first_name,
  p.last_name,
  ml.medication_id,
  m.name,
  ml.event_date,
  ml.event_key,
  ml.status,
  ml.schedule_id
HAVING COUNT(*) > 1  -- Only show duplicates
ORDER BY 
  ml.patient_id,
  ml.event_date,
  log_count DESC;

-- Also check for logs with the same event_key, patient_id, and medication_id
-- which should be unique per scan session
SELECT 
  ml.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  ml.event_key,
  ml.medication_id,
  m.name AS medication_name,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(ml.id ORDER BY ml.created_at) as log_ids,
  MIN(ml.event_date) as first_event_date,
  MAX(ml.event_date) as last_event_date
FROM medication_logs ml
JOIN patients p ON ml.patient_id = p.id
LEFT JOIN medications m ON ml.medication_id = m.id
WHERE DATE(ml.event_date) = '2025-12-08'
GROUP BY 
  ml.patient_id,
  p.first_name,
  p.last_name,
  ml.event_key,
  ml.medication_id,
  m.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, ml.patient_id;

-- Check scan sessions that might have been processed multiple times
SELECT 
  mss.id as session_id,
  mss.patient_id,
  p.first_name || ' ' || p.last_name AS patient_name,
  mss.scheduled_time,
  mss.medication_ids,
  mss.is_active,
  COUNT(ml.id) as log_count,
  ARRAY_AGG(ml.id) as log_ids
FROM medication_scan_sessions mss
JOIN patients p ON mss.patient_id = p.id
LEFT JOIN medication_logs ml ON ml.patient_id = mss.patient_id 
  AND ml.event_date::date = mss.scheduled_time::date
  AND EXTRACT(HOUR FROM ml.event_date) = EXTRACT(HOUR FROM mss.scheduled_time)
WHERE DATE(mss.scheduled_time) = '2025-12-08'
  AND EXTRACT(HOUR FROM mss.scheduled_time) = 14
GROUP BY 
  mss.id,
  mss.patient_id,
  p.first_name,
  p.last_name,
  mss.scheduled_time,
  mss.medication_ids,
  mss.is_active
HAVING COUNT(ml.id) > 10  -- More than expected (assuming 10 medications)
ORDER BY log_count DESC;

