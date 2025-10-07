-- Check logs for a specific patient
-- This will tell us if the patient in the UI actually has logs for Oct 5-7

-- Step 1: Find which patient you're looking at in the UI
-- (You'll see this in the console: "Fetching logs for patient: [ID] Name: [Name]")

-- Step 2: Replace PATIENT_ID_HERE with the actual patient ID from the console
SELECT 
  DATE(event_date) as log_date,
  COUNT(*) as log_count,
  array_agg(DISTINCT status) as statuses
FROM medication_logs
WHERE patient_id = 'PATIENT_ID_HERE'  -- REPLACE THIS
  AND event_date >= '2025-10-01'
GROUP BY DATE(event_date)
ORDER BY log_date DESC;

-- Step 3: Check ALL logs for this patient in the last week
SELECT 
  event_date,
  status,
  medication_id,
  source,
  created_at
FROM medication_logs
WHERE patient_id = 'PATIENT_ID_HERE'  -- REPLACE THIS
  AND event_date >= '2025-10-01'
ORDER BY event_date DESC;

-- Step 4: Compare with OTHER patients who DO have Oct 5-7 logs
-- (From your earlier SQL, patient_id '00e8ffae-5444-4d32-b2ff-112b4f7b53e0' has Oct 5 and Oct 7 logs)
SELECT 
  DATE(event_date) as log_date,
  COUNT(*) as log_count
FROM medication_logs
WHERE patient_id = '00e8ffae-5444-4d32-b2ff-112b4f7b53e0'  -- Known patient with Oct 5-7 logs
  AND event_date >= '2025-10-01'
GROUP BY DATE(event_date)
ORDER BY log_date DESC;

