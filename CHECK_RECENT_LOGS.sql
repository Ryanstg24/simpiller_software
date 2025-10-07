-- Check for recent medication logs
-- Run this in Supabase SQL Editor to see what's actually in the database

-- 1. Check the most recent logs across all patients
SELECT 
  ml.event_date,
  ml.status,
  p.first_name,
  p.last_name,
  m.name as medication_name,
  ml.qr_code_scanned,
  ml.created_at
FROM medication_logs ml
LEFT JOIN patients p ON p.id = ml.patient_id
LEFT JOIN medications m ON m.id = ml.medication_id
ORDER BY ml.event_date DESC
LIMIT 20;

-- 2. Check logs from the last 7 days
SELECT 
  DATE(ml.event_date) as log_date,
  COUNT(*) as log_count,
  COUNT(CASE WHEN ml.status = 'taken' THEN 1 END) as taken_count,
  COUNT(CASE WHEN ml.status = 'missed' THEN 1 END) as missed_count
FROM medication_logs ml
WHERE ml.event_date >= NOW() - INTERVAL '7 days'
GROUP BY DATE(ml.event_date)
ORDER BY log_date DESC;

-- 3. Check for a specific patient (replace with actual patient_id)
-- SELECT 
--   ml.event_date,
--   ml.status,
--   m.name as medication_name,
--   ml.qr_code_scanned
-- FROM medication_logs ml
-- LEFT JOIN medications m ON m.id = ml.medication_id
-- WHERE ml.patient_id = 'YOUR_PATIENT_ID_HERE'
-- ORDER BY ml.event_date DESC
-- LIMIT 50;

-- 4. Check if there are any recent scan sessions
SELECT 
  mss.scheduled_time,
  mss.is_active,
  mss.expires_at,
  p.first_name,
  p.last_name,
  mss.created_at
FROM medication_scan_sessions mss
LEFT JOIN patients p ON p.id = mss.patient_id
WHERE mss.scheduled_time >= NOW() - INTERVAL '7 days'
ORDER BY mss.scheduled_time DESC
LIMIT 20;

