-- Add drx_appointment_id column to drx_patient_sync table
-- This allows tracking which appointment was created when syncing a patient to DRX

ALTER TABLE drx_patient_sync 
ADD COLUMN IF NOT EXISTS drx_appointment_id VARCHAR(255);

-- Add index for faster lookups by appointment ID
CREATE INDEX IF NOT EXISTS idx_drx_patient_sync_appointment_id ON drx_patient_sync(drx_appointment_id);

-- Add comment to document the column
COMMENT ON COLUMN drx_patient_sync.drx_appointment_id IS 'DRX appointment ID created when syncing patient. Used for tracking and potential cancellation.';
