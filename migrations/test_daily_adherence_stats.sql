-- Test the get_daily_adherence_stats function
-- Run this in Supabase SQL Editor to verify the function works

-- Test 1: Get all adherence data (no filtering)
SELECT * FROM get_daily_adherence_stats(
  '2025-09-29'::DATE,
  '2025-10-30'::DATE,
  NULL,
  NULL
);

-- Test 2: Count total medication logs in the date range (to verify data exists)
SELECT 
  DATE(event_date) AS log_date,
  COUNT(*) AS total_logs,
  COUNT(*) FILTER (WHERE status = 'taken') AS successful_logs
FROM medication_logs
WHERE DATE(event_date) >= '2025-09-29'
  AND DATE(event_date) <= '2025-10-30'
GROUP BY DATE(event_date)
ORDER BY log_date ASC
LIMIT 10;

-- Test 3: Check if medication_logs table has data
SELECT COUNT(*) AS total_logs,
       MIN(event_date) AS earliest_log,
       MAX(event_date) AS latest_log
FROM medication_logs;

-- Test 4: Check a specific organization (replace with an actual org ID)
-- First, get an organization ID:
SELECT id, name FROM organizations LIMIT 5;

-- Then test with that org (uncomment and replace UUID):
-- SELECT * FROM get_daily_adherence_stats(
--   '2025-09-29'::DATE,
--   '2025-10-30'::DATE,
--   'YOUR-ORG-UUID-HERE'::UUID,
--   NULL
-- );

