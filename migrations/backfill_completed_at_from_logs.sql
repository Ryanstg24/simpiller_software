-- Backfill completed_at for historical scan sessions
-- This identifies sessions that were actually scanned by checking medication_logs

-- Step 1: Add the column if it doesn't exist
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Backfill completed_at for sessions that have medication logs
-- A session is considered "completed" if ANY medication in that session was scanned
UPDATE medication_scan_sessions mss
SET completed_at = (
  SELECT MIN(ml.event_date)
  FROM medication_logs ml
  WHERE ml.patient_id = mss.patient_id
    AND ml.status = 'taken'
    AND ml.qr_code_scanned IS NOT NULL  -- Only count actual scans
    -- Match by date/time window: log created within 2 hours after scheduled time
    AND ml.event_date >= mss.scheduled_time
    AND ml.event_date <= (mss.scheduled_time + INTERVAL '2 hours')
    -- Match by medication: at least one medication matches
    AND ml.medication_id = ANY(mss.medication_ids)
)
WHERE completed_at IS NULL  -- Only update if not already set
  AND is_active = false     -- Only for inactive sessions
  AND EXISTS (
    -- Only update if there's a matching log
    SELECT 1
    FROM medication_logs ml
    WHERE ml.patient_id = mss.patient_id
      AND ml.status = 'taken'
      AND ml.qr_code_scanned IS NOT NULL
      AND ml.event_date >= mss.scheduled_time
      AND ml.event_date <= (mss.scheduled_time + INTERVAL '2 hours')
      AND ml.medication_id = ANY(mss.medication_ids)
  );

-- Step 3: Check results
SELECT 
  'Backfill Summary' as info,
  COUNT(*) as total_sessions,
  COUNT(completed_at) as sessions_with_completed_at,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND is_active = false) as completed_sessions,
  COUNT(*) FILTER (WHERE completed_at IS NULL AND is_active = false) as expired_sessions,
  COUNT(*) FILTER (WHERE is_active = true) as pending_sessions
FROM medication_scan_sessions;

-- Step 4: Show sample of updated sessions
SELECT 
  'Sample Updated Sessions' as info,
  id,
  scheduled_time,
  completed_at,
  CASE 
    WHEN completed_at IS NOT NULL THEN 'Completed'
    WHEN is_active = false THEN 'Expired'
    ELSE 'Pending'
  END as derived_status
FROM medication_scan_sessions
WHERE completed_at IS NOT NULL
ORDER BY completed_at DESC
LIMIT 10;
