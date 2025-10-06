-- Add missing columns to medication_scan_sessions table
-- These columns are referenced in the code but missing from the table

-- Add status column (tracks session completion status)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
CHECK (status IN ('pending', 'completed', 'failed', 'expired'));

-- Add completed_at column (timestamp when session was completed)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at column (track last update time)
ALTER TABLE medication_scan_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger to auto-update updated_at column
CREATE OR REPLACE TRIGGER update_medication_scan_sessions_updated_at
  BEFORE UPDATE ON medication_scan_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'medication_scan_sessions'
ORDER BY ordinal_position;
