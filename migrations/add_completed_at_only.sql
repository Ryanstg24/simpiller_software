-- Add ONLY completed_at column to medication_scan_sessions
-- This is the minimal change needed to distinguish completed vs expired sessions

-- Add completed_at column (timestamp when session was completed via scan)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'medication_scan_sessions' 
AND column_name = 'completed_at';
